import * as THREE from '../vthree/VTHREE.ts';
import VMaterial from './VMaterial.ts';
import * as VMaterialUtils from './VMaterialUtils.ts';

type ShaderPatch = THREE.MeshStandardMaterial['onBeforeCompile'];

export default THREE.MeshStandardMaterial;

class _VMeshStandardMaterial
  extends THREE.MeshStandardMaterial
  implements VMaterial {
  _shader!: THREE.WebGLProgramParametersWithUniforms;
  envMapPosition: THREE.Vector3 = new THREE.Vector3();
  envMapSize: THREE.Vector3 = new THREE.Vector3();

  dissolveMaxDist: number = 0;
  _dissolveOrigin: THREE.Vector3 = new THREE.Vector3();
  dissolveDirection: boolean = false;
  dissolveProgress: number = 0;

  lightMapToChange: THREE.Texture | null = null;

  defaultOnBeforeCompile: ShaderPatch;

  constructor(parameters?: THREE.MeshStandardMaterialParameters) {
    super(parameters);
    this.useProgressiveAlpha = true;
    // Add CustomShaders on Material
    const defaultCompilePatch = (
      shader: THREE.THREE.WebGLProgramParametersWithUniforms,
      renderer: THREE.WebGLRenderer,
    ) => {
      THREE.MeshStandardMaterial.prototype.onBeforeCompile(shader, renderer);

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

      this._shader = shader;
      this.needsUpdate = true;
    };

    this.defaultOnBeforeCompile = (shader, renderer) => {
      defaultCompilePatch(shader, renderer);
    };

    this.onBeforeCompile = (shader, renderer) => {
      defaultCompilePatch(shader, renderer);
    };
  }

  static fromThree(
    material: THREE.MeshStandardMaterial,
  ): VMeshStandardMaterial {
    return new VMeshStandardMaterial(material as any);
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
      console.warn('Material Uniform Not initialized, need to render');
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
      params?: THREE.MeshStandardMaterialParameters,
    ) => this;
    return new ctor(this as THREE.MeshStandardMaterialParameters);
  }

  set dissolveOrigin(dissolveOrigin: THREE.Vector3) {
    this._dissolveOrigin.copy(dissolveOrigin);
  }

  addDefines(key: string, value: any = '') {
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

