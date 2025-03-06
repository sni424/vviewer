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
wp = modelMatrix * vec4( transformed, 1.0 ).xyz;
`;

export const VShaderLib = {
  V_LIGHTS_FRAGMENT_MAPS: V_LIGHTS_FRAGMENT_MAPS,
  V_LIGHTMAP_PARS_FRAGMENT: V_LIGHTMAP_PARS_FRAGMENT,
  V_VERTEX_WORLD_POSITION: VERTEX_WORLD_POSITION,
};
