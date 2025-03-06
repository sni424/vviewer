// TODO 위에다 적어야 실행이 됨 좋은 방법을 찾아야할듯
const V_LIGHTS_FRAGMENT_MAPS = `
#if defined( RE_IndirectDiffuse )

  #ifdef USE_LIGHTMAP

    vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		#ifdef USE_LIGHTMAP_CONTRAST
      lightMapIrradiance = pow(lightMapIrradiance, vec3(lightMapContrast));
    #endif
    irradiance += lightMapIrradiance;
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

const V_LIGHTMAP_PARS_FRAGMENT = `
#ifdef USE_LIGHTMAP

	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
	uniform float lightMapContrast;

#endif
`;

const VERTEX_WORLD_POSITION = `
varying vec3 wp;
`;

// const addAlphaMixFunc = `
// float progressiveAlpha(float progress, float x, float xMin, float xMax) {
//   float mid = mix(xMin, xMax, 0.5); // Midpoint of xMin and xMax
//   float denominator = max(abs(xMax - mid), 0.0001); // 0으로 나누기 방지
//   float factor = abs(x - mid) / denominator; // Symmetric distance from mid
//   return clamp(1.0 - 2.0 * progress * factor, 0.0, 1.0);
// }
// void main()
// `;

const addAlphaMixFunc = `
float progressiveAlpha(float progress, float x, float xMin, float xMax) {
  float mid = mix(xMin, xMax, 0.5); // Midpoint of xMin and xMax
  float factor = abs(x - mid) / max(xMax - mid, 0.0001); // 0으로 나누는 문제 방지
  return clamp(1.0 - 4.0 * progress * factor, 0.0, 1.0);
}
void main()
`;

export const VShaderLib = {
  V_LIGHTS_FRAGMENT_MAPS: V_LIGHTS_FRAGMENT_MAPS,
  V_LIGHTMAP_PARS_FRAGMENT: V_LIGHTMAP_PARS_FRAGMENT,
  V_VERTEX_WORLD_POSITION: VERTEX_WORLD_POSITION,
  V_ALPHA_MIX_FUNC: addAlphaMixFunc,
};
