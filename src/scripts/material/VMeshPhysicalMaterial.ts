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
    this.onBeforeCompile = (shader, renderer) => {
      THREE.MeshPhysicalMaterial.prototype.onBeforeCompile(shader, renderer);
      // VERTEX
      VMaterialUtils.addWorldPosition(shader);
      // FRAGMENT
      VMaterialUtils.adjustLightMapFragments(shader);
      VMaterialUtils.addAlphaFunction(shader);

      this.shader = shader;
    };
  }

  oBC() {
    return this.onBeforeCompile;
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
    }
  }

  get uniforms() {
    return this._shader.uniforms;
  }

  clone(): this {
    // TODO Clone 시 shader 안담기는 문제 해결해야함.
    return new VMeshPhysicalMaterial(this);
  }

  setUseLightMapContrast(use: boolean) {
    const defines = this.defines || {};
    if (use) defines['USE_LIGHTMAP_CONTRAST'] = '';
    else delete defines['USE_LIGHTMAP_CONTRAST'];
    this.needsUpdate = true;
  }

  getUseLightMapContrast(): boolean {
    return this.defines?.USE_LIGHTMAP_CONTRAST !== undefined;
  }
}
