import { THREE } from '../VTHREE.ts';
import { VMaterial } from './VMaterial.ts';
import * as VMaterialUtils from './VMaterialUtils.ts';

export default class VMeshPhysicalMaterial
  extends THREE.MeshPhysicalMaterial
  implements VMaterial
{
  private _shader: THREE.WebGLProgramParametersWithUniforms;

  constructor(parameters?: THREE.MeshPhysicalMaterialParameters) {
    super(parameters);
    this.useProgressiveAlpha = true;
    this.onBeforeCompile = (shader, renderer) => {
      // call Default Material OnBeforeCompile
      THREE.MeshPhysicalMaterial.prototype.onBeforeCompile(shader, renderer);
      // VERTEX
      VMaterialUtils.addWorldPosition(shader);
      // FRAGMENT
      VMaterialUtils.adjustLightMapFragments(shader);
      VMaterialUtils.addProgressiveAlpha(shader);

      this.shader = shader;
      this.needsUpdate = true;
    };
  }

  static fromThree(
    material: THREE.MeshPhysicalMaterial,
  ): VMeshPhysicalMaterial {
    return new VMeshPhysicalMaterial(material);
  }

  get shader() {
    return this._shader;
  }

  set shader(shader: THREE.WebGLProgramParametersWithUniforms) {
    this._shader = shader;
  }

  setUniformByValue(key: string, value: any) {
    const uniform = new THREE.Uniform(value);
    this.setUniform(key, uniform);
  }

  setUniform(key: string, uniform: THREE.Uniform) {
    const shader = this._shader;
    if (!shader) {
      console.warn('Material Uniform Not initialized');
      return;
    }
    const uniforms = shader.uniforms;
    if (Object.keys(uniforms).includes(key)) {
      // 이미 있는 uniform
      uniforms[key].value = uniform.value;
    } else {
      // 새로운 유니폼
      uniforms[key] = uniform;
      this.needsUpdate = true;
    }
  }

  get uniforms() {
    return this._shader.uniforms;
  }

  clone(): this {
    // TODO Clone 시 shader 안담기는 문제 해결해야함.
    return new VMeshPhysicalMaterial(this);
  }

  addDefines(key: string, value?: any = '') {
    const defines = this.defines!!;
    defines[key] = value;
  }

  removeDefines(key: string) {
    delete this.defines!![key];
  }

  set useLightMapContrast(use: boolean) {
    if (use) this.addDefines('USE_LIGHTMAP_CONTRAST');
    else this.removeDefines('USE_LIGHTMAP_CONTRAST');
    this.needsUpdate = true;
  }

  get useLightMapContrast(): boolean {
    return this.defines!!.USE_LIGHTMAP_CONTRAST !== undefined;
  }

  set useProgressiveAlpha(use: boolean) {
    if (use) this.addDefines('USE_PROGRESSIVE_ALPHA');
    else this.removeDefines('USE_PROGRESSIVE_ALPHA');
    this.needsUpdate = true;
  }

  get useProgressiveAlpha(): boolean {
    return this.defines!!.USE_PROGRESSIVE_ALPHA !== undefined;
  }
}
