import { THREE } from '../VTHREE.ts';
import * as VMaterialUtils from './VMaterialUtils.ts';

export default class VMeshPhysicalMaterial extends THREE.MeshPhysicalMaterial {
  private _shader: THREE.WebGLProgramParametersWithUniforms;

  constructor(parameters?: THREE.MeshPhysicalMaterialParameters) {
    super(parameters);
    this.onBeforeCompile = (shader, renderer) => {
      THREE.MeshPhysicalMaterial.prototype.onBeforeCompile(shader, renderer);

      VMaterialUtils.adjustLightMap(shader);

      this._shader = shader;
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

  addUniform() {
    const shader = this._shader;
  }

  get uniforms() {
    return this._shader.uniforms;
  }

  clone(): this {
    // TODO Clone 시 shader 안담기는 문제 해결해야함.
    return new VMeshPhysicalMaterial(this);
  }
}
