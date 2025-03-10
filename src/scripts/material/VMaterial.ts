import * as THREE from '../VTHREE.ts';

export interface VMaterial extends THREE.MeshStandardMaterial {
  get shader(): THREE.WebGLProgramParametersWithUniforms;

  set shader(shader: THREE.WebGLProgramParametersWithUniforms);

  get uniforms(): { [uniform: string]: THREE.IUniform };

  clone(): this;

  setUniformByValue(key: string, value: any): void;

  setUniform(key: string, uniform: THREE.Uniform): void;

  addDefines(key: string, value?: any = ''): void;

  removeDefines(key: string): void;

  set useLightMapContrast(use: boolean): void;

  get useLightMapContrast(): boolean;

  set useProgressiveAlpha(use: boolean);

  get useProgressiveAlpha(): boolean;
}
