import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'VTHREE';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { useAtomValue } from 'jotai';
import { sharpenAtom } from 'src/scripts/atoms.ts';

const sharpenShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2() },
    strength: { value: 2.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      // 하위 코드는 Quad 적용 용
      //vUv = position.xy*0.5+0.5; 
      //gl_Position = vec4(position.xy, 1.0, 1.0);
    }
  `,
  fragmentShader: `
    #define GAMMA_FACTOR 2.200000047683716
    uniform mediump sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float strength;
    varying vec2 vUv;
    
    vec4 LinearToGamma(vec4 value, float gammaFactor ) {
      return vec4( pow( value.rgb, vec3( 1.0 / gammaFactor ) ), value.a );
    }
    
    vec4 linearToOutputTexel2( vec4 value ) {
      return LinearToGamma( value, float( GAMMA_FACTOR ) );
    }

    void main() {
      vec4 original = texture2D(tDiffuse, vUv);
      vec2 fragCoord = vUv * resolution;
      float neighbor = strength * -1.0;
      float center = strength * 4.0 + 1.0;
      vec3 color = original.rgb * center
      + texture2D(tDiffuse, (fragCoord + vec2( 1, 0)) / resolution).rgb * neighbor
      + texture2D(tDiffuse, (fragCoord + vec2(-1, 0)) / resolution).rgb * neighbor
      + texture2D(tDiffuse, (fragCoord + vec2( 0, 1)) / resolution).rgb * neighbor
      + texture2D(tDiffuse, (fragCoord + vec2( 0, -1)) / resolution).rgb * neighbor;
      gl_FragColor = linearToOutputTexel2(mix(original, vec4(color, original.a), 1.0));
    }
  `,
};

const Sharpen = () => {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef<EffectComposer>();
  const sharpenPassRef = useRef<ShaderPass>();
  const {value: sharpenValue} = useAtomValue(sharpenAtom);

  useEffect(() => {
    const renderPass = new RenderPass(scene, camera);
    const sharpenPass = new ShaderPass(sharpenShader);
    sharpenPassRef.current = sharpenPass;
    composer.current = new EffectComposer(gl);
    const c = composer.current;
    c.addPass(renderPass);
    c.addPass(sharpenPass);
    c.setSize(size.width, size.height);
    sharpenPass.uniforms.resolution.value.set(size.width, size.height);
  }, [gl, scene, camera, size]);

  useFrame(() => {
    composer.current.render();
  }, 1)

  useEffect(() => {
    if (sharpenPassRef.current) {
      const sp = sharpenPassRef.current;
      sp.uniforms.strength.value = sharpenValue;
    }
  }, [sharpenValue]);

  return null;
};

export default Sharpen;
