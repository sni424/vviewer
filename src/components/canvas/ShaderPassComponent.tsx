import { useFrame, useThree } from '@react-three/fiber';
import { useAtomValue } from 'jotai';
import { useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { sharpenAtom } from 'src/scripts/atoms';
import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  ShaderPass,
} from 'three/examples/jsm/Addons.js';

// 이유: 셰이더 유니폼 타입 정의
// 결과: 타입 안전한 유니폼 관리
interface ShaderUniforms {
  tDiffuse: { value: THREE.Texture | null };
  resolution: { value: THREE.Vector2 };
  strength: { value: number };
  opacity: { value: number };
}

// 이유: 샤프닝 셰이더 정의
// 결과: 최적화된 샤프닝 및 블렌딩 효과
const mainShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2() },
    strength: { value: 1.0 },
    opacity: { value: 1.0 },
    isSharpen: { value: true },
  } as ShaderUniforms,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
  #define GAMMA_FACTOR 2.2
    uniform mediump sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float strength;
    uniform float opacity;
    uniform bool isSharpen;
    varying vec2 vUv;

       // 이유: 선형 색상을 감마 색상 공간으로 변환
      // 결과: 감마 보정된 색상 반환
      vec4 LinearToGamma(vec4 value, float gammaFactor) {
        return vec4(pow(value.rgb, vec3(1.0 / gammaFactor)), value.a);
      }

      // 이유: 출력 텍셀을 감마 보정
      // 결과: 선형 → sRGB 출력
      vec4 linearToOutputTexel2(vec4 value) {
        return LinearToGamma(value, float(GAMMA_FACTOR));
      }

    // 이유: 샤프닝 효과 적용
    // 결과: 텍스처 선명도 조절, 클램핑 포함
    void e0MainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      vec2 fragCoord = uv * resolution;
      float neighbor = strength * -1.0;
      float center = strength * 4.0 + 1.0;
      vec3 color = inputColor.rgb * center
        + texture2D(tDiffuse, (fragCoord + vec2(1.0, 0.0)) / resolution).rgb * neighbor
        + texture2D(tDiffuse, (fragCoord + vec2(-1.0, 0.0)) / resolution).rgb * neighbor
        + texture2D(tDiffuse, (fragCoord + vec2(0.0, 1.0)) / resolution).rgb * neighbor
        + texture2D(tDiffuse, (fragCoord + vec2(0.0, -1.0)) / resolution).rgb * neighbor;
      outputColor = vec4(clamp(color, 0.0, 1.0), inputColor.a);
    }

    // 이유: 원본과 샤프닝 결과를 혼합
    // 결과: opacity에 따라 자연스러운 샤프닝 효과
    vec4 blend23(const in vec4 x, const in vec4 y, const in float opacity) {
      return mix(x, y, opacity);
    }

    // 이유: 프래그먼트 셰이더 진입점
    // 결과: 샤프닝 및 블렌딩 적용
    void main() {
      
      vec4 color0 = texture2D(tDiffuse, vUv); // sRGB 입력
           vec4 color1 = vec4(0.0);
      if (strength > 0.0 && opacity > 0.0 && isSharpen) {
   
        e0MainImage(color0, vUv, color1);
        color0 = blend23(color0, color1, 1.0);
   
   
      }
      gl_FragColor = linearToOutputTexel2( color0 );
      // gl_FragColor = color0;
      
    }
  `,
};

// 이유: 샤프닝 상태 타입 정의
// 결과: 타입 안전한 상태 관리
interface SharpenState {
  isSharpen: boolean;
  strength: number;
}

// 이유: EffectComposer를 사용한 후처리 컴포넌트`
// 결과: 최적화된 샤프닝 효과 적용
const ShaderPassComponent = () => {
  const { gl, size, scene, camera } = useThree();
  const sharpenValue = useAtomValue(sharpenAtom);
  const mainPassRef = useRef<ShaderPass | null>(null);

  const location = useLocation();

  const isMobile = useMemo(() => {
    return location.pathname === '/mobile';
  }, [location.pathname]);

  // const pixelRatio = Math.min(window.devicePixelRatio, 2.0);
  const pixelRatio = Math.min(
    window.devicePixelRatio,
    !isMobile ? gl.getPixelRatio() : window.devicePixelRatio / 2,
  );

  const composer = useMemo(() => {
    const renderTarget = new THREE.WebGLRenderTarget(
      size.width * (sharpenValue.isRatio ? pixelRatio : 1),
      size.height * (sharpenValue.isRatio ? pixelRatio : 1),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.UnsignedByteType,
        samples: !isMobile
          ? sharpenValue.aliasing
          : window.devicePixelRatio > 3
            ? 8
            : 1, // MSAA 비활성화
        generateMipmaps: false, // 밉맵 비활성화 (고해상도 디테일 유지)
        depthBuffer: true, // 깊이 버퍼 비활성화
        stencilBuffer: false, // 스텐실 버퍼 비활성화
      },
    );

    // 이유: EffectComposer 설정
    // 결과: 단일 패스 후처리 파이프라인
    const composer = new EffectComposer(gl, renderTarget);
    composer.addPass(new RenderPass(scene, camera));

    // 이유: 메인 패스 추가
    // 결과: 샤프닝 효과 적용
    const mainPass = new ShaderPass(mainShader);
    mainPass.uniforms.resolution.value.set(size.width, size.height);

    mainPassRef.current = mainPass;
    composer.addPass(mainPass);

    return composer;
  }, [gl, size, scene, camera, sharpenValue.isRatio, sharpenValue.aliasing]);

  // 이유: 유니폼 동적 업데이트
  // 결과: composer 재생성 없이 성능 최적화
  useFrame(() => {
    if (mainPassRef.current) {
      mainPassRef.current.uniforms.strength.value = sharpenValue.strength;

      mainPassRef.current.uniforms.opacity.value = sharpenValue.opacity;
      mainPassRef.current.uniforms.isSharpen.value = sharpenValue.isSharpen;
    }
    composer.render();
  }, 1);

  return null;
};

export default ShaderPassComponent;
