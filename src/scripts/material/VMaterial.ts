import * as THREE from '../vthree/VTHREE.ts';

export default THREE.Material;

// export default interface VMaterial extends THREE.MeshStandardMaterial {
//   get shader(): THREE.WebGLProgramParametersWithUniforms;

//   set shader(shader: THREE.WebGLProgramParametersWithUniforms);

//   get uniforms(): { [uniform: string]: THREE.IUniform };

//   clone(): this;

//   copy(source: VMaterial): this;

//   setUniformByValue(key: string, value: any): void;

//   setUniform(key: string, uniform: THREE.Uniform): void;

//   addDefines(key: string, value?: any = ''): void;

//   removeDefines(key: string): void;

//   set dissolveMaxDist(dist: number): void;

//   set dissolveOrigin(origin: THREE.Vector3): void;

//   set dissolveDirection(direction: boolean): void;

//   set dissolveProgress(progress: number): void;

//   set useLightMapContrast(use: boolean): void;

//   get useLightMapContrast(): boolean;

//   set useProgressiveAlpha(use: boolean);

//   get useProgressiveAlpha(): boolean;

//   set useBoxProjectedEnv(use: boolean);

//   get useBoxProjectedEnv(): boolean;

//   updateEnvUniforms(position: THREE.Vector3, size: THREE.Vector3);
// }


