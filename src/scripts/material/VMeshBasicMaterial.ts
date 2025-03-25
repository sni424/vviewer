import { THREE } from '../VTHREE.ts';
import VMaterial from './VMaterial.ts';
import * as VMaterialUtils from './VMaterialUtils.ts';

class VMeshBasicMaterial extends THREE.MeshBasicMaterial implements VMaterial {
  _shader: THREE.WebGLProgramParametersWithUniforms;
  envMapPosition: THREE.Vector3 = new THREE.Vector3();
  envMapSize: THREE.Vector3 = new THREE.Vector3();
  dissolveMaxDist: number = 0;
  _dissolveOrigin: THREE.Vector3 = new THREE.Vector3();
  dissolveDirection: boolean = false;
  dissolveProgress: number = 0;

  lightMapToChange: THREE.Texture | null = null;

  constructor(parameters?: THREE.MeshBasicMaterialParameters) {
    super(parameters);

    /** 기본적으로 three.js 의 Material 은 defines === undefined
     * 그러나 Basic 으로부터 파생되는 Material 은 defines 가 정의 되어있음.
     * MeshStandardMaterial -> defines : {STANDARD: ''}
     * MeshPhysicalMaterial -> defines : {PHYSICAL: '', STANDARD: ''}
     */
    if (!this.defines) {
      this.defines = {};
      this.useProgressiveAlpha = true;
    }

    this.onBeforeCompile = (shader, renderer) => {
      THREE.MeshBasicMaterial.prototype.onBeforeCompile(shader, renderer);
      // VERTEX
      VMaterialUtils.addWorldPosition(shader);
      // FRAGMENT
      VMaterialUtils.adjustLightMapFragments(shader);
      VMaterialUtils.addProgressiveAlpha(shader, {
        maxDist: this.dissolveMaxDist,
        origin: this._dissolveOrigin,
        dir: this.dissolveDirection,
        progress: this.dissolveProgress,
      });
      VMaterialUtils.addBoxProjectedEnv(
        shader,
        this.envMapPosition,
        this.envMapSize,
      );
      VMaterialUtils.addLightMapChangeTransition(
        shader,
        this.lightMapToChange
      )

      this.shader = shader;
      this.needsUpdate = true;
    };
  }

  static fromThree(material: THREE.MeshBasicMaterial): VMeshBasicMaterial {
    return new VMeshBasicMaterial(material);
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
    console.log(`${key} uniform Updated : `, uniforms[key]);
  }

  get uniforms() {
    return this._shader.uniforms;
  }

  clone(): this {
    const ctor = this.constructor as new (
      params?: THREE.MeshBasicMaterialParameters,
    ) => this;
    return new ctor(this as THREE.MeshBasicMaterialParameters);
  }

  set dissolveOrigin(dissolveOrigin: THREE.Vector3) {
    this._dissolveOrigin.copy(dissolveOrigin);
  }

  addDefines(key: string, value?: any = '') {
    const defines = this.defines!!;
    defines[key] = value;
  }

  removeDefines(key: string) {
    delete this.defines!![key];
  }

  private updateDefines(key: string, use: boolean) {
    if (use) this.addDefines(key);
    else this.removeDefines(key);
    this.needsUpdate = true;
  }

  set useLightMapContrast(use: boolean) {
    this.updateDefines('USE_LIGHTMAP_CONTRAST', use);
  }

  get useLightMapContrast(): boolean {
    return this.defines!!.USE_LIGHTMAP_CONTRAST !== undefined;
  }

  set useProgressiveAlpha(use: boolean) {
    this.updateDefines('USE_PROGRESSIVE_ALPHA', use);
  }

  get useProgressiveAlpha(): boolean {
    return this.defines!!.USE_PROGRESSIVE_ALPHA !== undefined;
  }

  set useBoxProjectedEnv(use: boolean) {
    this.updateDefines('BOX_PROJECTED_ENV_MAP', use);
  }

  get useBoxProjectedEnv(): boolean {
    return this.defines!!.BOX_PROJECTED_ENV_MAP !== undefined;
  }

  updateEnvUniforms(position: THREE.Vector3, size: THREE.Vector3) {
    this.envMapPosition.copy(position);
    this.envMapSize.copy(size);
    this.useBoxProjectedEnv = true;
    if (!this.envMap) {
      console.warn('VMaterial.updateEnvUniforms(): No EnvMap Found');
    }
    this.needsUpdate = true;
  }
}

export default VMeshBasicMaterial;
