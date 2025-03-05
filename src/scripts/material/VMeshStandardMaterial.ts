import { THREE } from '../VTHREE.ts';
import * as VMaterialUtils from './VMaterialUtils.ts';

export default class VMeshStandardMaterial extends THREE.MeshStandardMaterial {
  private _shader: THREE.WebGLProgramParametersWithUniforms;

  constructor(parameters?: THREE.MeshStandardMaterialParameters) {
    super(parameters);
    this.onBeforeCompile = (shader, renderer) => {
      THREE.MeshStandardMaterial.prototype.onBeforeCompile(shader, renderer);

      VMaterialUtils.adjustLightMap(shader);

      this._shader = shader;
    };
  }

  static fromThree(
    material: THREE.MeshStandardMaterial,
  ): VMeshStandardMaterial {
    return new VMeshStandardMaterial(material);
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
    return new VMeshStandardMaterial(this);
  }
}
const LightMapContrastShader = `
#if defined( RE_IndirectDiffuse )

  #ifdef USE_LIGHTMAP

    vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
    irradiance += pow(lightMapIrradiance, vec3(lightMapContrast));
    
  #endif

  #if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )

    iblIrradiance += getIBLIrradiance( geometryNormal );

  #endif

#endif

#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )

  #ifdef USE_ANISOTROPY

    radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );

  #else

    radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );

  #endif

  #ifdef USE_CLEARCOAT

    clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );

  #endif

#endif
`;

const LIGHTMAP_PARS = `
#ifdef USE_LIGHTMAP

	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
	uniform float lightMapContrast;
	uniform bool useLightMapContrast;

#endif
`;
