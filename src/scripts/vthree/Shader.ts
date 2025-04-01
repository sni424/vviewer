import * as THREE from 'three';

declare module 'three' {

  interface WebGLProgramParametersWithUniforms {
    cleanup?: () => void;
    // uniforms: {
    //   [uniform: string]: THREE.IUniform<any>;
    // }
  }

}