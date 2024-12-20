#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

  #ifndef USE_LIGHTMAP_CONTRAST
  #define USE_LIGHTMAP_CONTRAST
  uniform bool lmContrastOn;
  uniform float lmContrastValue;
  uniform float lmContrastK;
  #endif
  
  // 불변 상수 계산

  vec3 applyGammaCorrection(vec3 color, vec3 gammaFactor) {
    return pow(color, gammaFactor);
  }

  float luminance(vec3 color, float gammaFactor) {
    vec3 corrected = pow(color, vec3(gammaFactor));
    return dot(corrected, vec3(0.2126, 0.7152, 0.0722));
  }
  
  float S_k_t(float x, float k, float t, float r) {
    // x를 지수로 조정
    float x_exp = pow(x, t); // x^(log2 / logt)

    // 중간값 계산
    float term = x_exp - 1.0; // 나눗셈 병합
    float denominatorInv = 1.0 / (1.0 + pow(term, k)); // 역수 미리 계산

    // 최종 결과: 나눗셈 대신 곱셈
    return (1.0 - r) * denominatorInv + r;
  }

  vec3 adjustContrast(vec3 color, float contrastFactor) {
      // Apply gamma correction to linearize color
      float gammaFactor = 2.2;
      float standard = 0.5; // 기준값 (수식에서 t)
      float t = log(2.0) / log(standard);
      float k = 4.0; // 곡률
      float r = 0.5; // 명도 스케일링 상수

      color = applyGammaCorrection(color, vec3(gammaFactor)); // Assuming sRGB
      
      // Decompose into reflectance and illumination (simplified Retinex-inspired method)
      float intensity = dot(color, vec3(0.2126, 0.7152, 0.0722)); // Luminance
      // float intensity = dot(color, vec3(1.0, 1.0, 1.0)); // Luminance
      
      float adjustedIntensity = S_k_t(intensity, k, t, r);
      
      vec3 reflectance = color / (intensity + 0.0001);
      
      // Adjust contrast of reflectance
      reflectance = (reflectance - standard) * contrastFactor + standard;
      
      // Recombine with original intensity
      // vec3 adjustedColor = reflectance * intensity * intensity; // 제곱
      vec3 adjustedColor = reflectance * adjustedIntensity;
      
      // Apply inverse gamma correction to return to sRGB
      adjustedColor = applyGammaCorrection(adjustedColor, vec3(1.0 / gammaFactor));
      
      return adjustedColor;
  }
  
  vec3 adjustContrast4(vec3 color, float contrastFactor, float k) {
    // 감마 보정 적용 (선형화)
    float gammaFactor = 2.2;
    float standard = 0.5; // 기준값 (수식에서 t)
    float t = log(2.0) / log(standard);
    float r = 0.5; // 명도 스케일링 상수
    color = applyGammaCorrection(color, vec3(gammaFactor)); // Assuming sRGB

    // 명도 계산 (Luminance)
    float intensity = dot(color, vec3(0.2126, 0.7152, 0.0722));

    // 비선형 명도 강조: S_k_t 함수 적용
    float adjustedIntensity = S_k_t(intensity, k, t, r);

    // 명도 대비 조절: 비선형 대비 적용
    adjustedIntensity = pow(adjustedIntensity, contrastFactor);

    // Reflectance 계산 (색상과 명도 분리)
    vec3 reflectance = color / (intensity + 0.0001);

    // 새로운 명도를 반영
    vec3 adjustedColor = reflectance * adjustedIntensity * adjustedIntensity;

    // 감마 역보정 (sRGB로 복귀)
    adjustedColor = applyGammaCorrection(adjustedColor, vec3(1.0 / gammaFactor));

    return adjustedColor;
  }

  vec3 adjustContrast2(vec3 color) {
    // vec3 lmcolor = lightMapTexel.rgb;
    
    // float standard = 0.5;
    // float contrast = lmContrastValue;
    // contrast = contrast*standard + standard;
    // lmcolor = clamp(lmcolor, 0.0, 1.0);
    // lmcolor = (lmcolor - 0.5) * contrast + 0.5;
    // lmcolor = smoothstep(0.0, 1.0, lmcolor);
    // return lmcolor;
    return color;
  }

  vec3 adjustContrast3(vec3 color, float value) {
    vec3 lmcolor = color;
    float r = (lmcolor.r - 0.5) * (lmcolor.r - 0.5);
    float g = (lmcolor.g - 0.5) * (lmcolor.g - 0.5);
    float b = (lmcolor.b - 0.5) * (lmcolor.b - 0.5);
    lmcolor.r = r;
    lmcolor.g = g;
    lmcolor.b = b;

    lmcolor.r = 1.0;
    lmcolor.g = 0.0;
    lmcolor.b = 0.0;
    
    
    // float standard = 0.5;
    // float contrast = lmContrastValue;
    // contrast = contrast*standard + standard;
    // lmcolor = clamp(lmcolor, 0.0, 1.0);
    // lmcolor = (lmcolor - 0.5) * contrast + 0.5;
    // lmcolor = smoothstep(0.0, 1.0, lmcolor);
    // return lmcolor;
    return lmcolor;
  }

  void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	

  #if defined( RE_IndirectDiffuse )

	#ifdef USE_LIGHTMAP

		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
    vec3 lmcolor = adjustContrast4(lightMapTexel.rgb, lmContrastValue, lmContrastK);

    
		vec3 lightMapIrradiance = lmcolor * lightMapIntensity;
		// vec3 lightMapIrradiance = lmcolor * lightMapIntensity;
		// vec3 lightMapIrradiance = lightMapTexel.rgb * 0.0;

		irradiance += lightMapIrradiance;
    // irradiance = vec3(0.0);

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
  
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}