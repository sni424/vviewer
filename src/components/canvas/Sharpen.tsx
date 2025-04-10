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
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float strength;
    varying vec2 vUv;

    void main() {
      vec4 original = texture2D(tDiffuse, vUv);
      vec2 texelSize = 1.0 / resolution;
      vec4 blur = vec4(0.0);
      blur += texture2D(tDiffuse, vUv + vec2(-texelSize.x, -texelSize.y));
      blur += texture2D(tDiffuse, vUv + vec2(0.0, -texelSize.y));
      blur += texture2D(tDiffuse, vUv + vec2(texelSize.x, -texelSize.y));
      blur += texture2D(tDiffuse, vUv + vec2(-texelSize.x, 0.0));
      blur += texture2D(tDiffuse, vUv);
      blur += texture2D(tDiffuse, vUv + vec2(texelSize.x, 0.0));
      blur += texture2D(tDiffuse, vUv + vec2(-texelSize.x, texelSize.y));
      blur += texture2D(tDiffuse, vUv + vec2(0.0, texelSize.y));
      blur += texture2D(tDiffuse, vUv + vec2(texelSize.x, texelSize.y));
      blur /= 9.0;
      vec4 difference = original - blur;
      gl_FragColor = original + strength * difference;
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
