import * as THREE from 'three';

declare module 'three' {

  interface WebGLProgramParametersWithUniforms {
    cleanup?: () => void;
  }

}