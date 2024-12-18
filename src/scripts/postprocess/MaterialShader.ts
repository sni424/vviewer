import * as THREE from 'three';

export class LightmapImageContrast {
  static min = -0.5;
  static max = 5.5;
  static step = 0.005;
  static on = false;
  static value = 0.0;
}

declare module 'three' {

  interface Material {
    onBeforeCompile: (parameters: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) => void;
  }
}

const _prevMaterial_onBeforeCompile = THREE.Material.prototype.onBeforeCompile;
THREE.Material.prototype.onBeforeCompile = function (parameters: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) {
  _prevMaterial_onBeforeCompile(parameters, renderer);


  // if (!parameters.uniforms.lmContrastOn) {
  parameters.uniforms = {
    ...parameters.uniforms,
    lmContrastOn: new THREE.Uniform(LightmapImageContrast.on)
  }
  // }
  // if (!parameters.uniforms.lmContrastValue) {
  parameters.uniforms = {
    ...parameters.uniforms,
    lmContrastValue: new THREE.Uniform(LightmapImageContrast.value)
  }

  if (!LightmapImageContrast.on) {
    return;
  }
  // }
  /**
   * "uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
  varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
  vec4 diffuseColor = vec4( diffuse, opacity );
  #include <clipping_planes_fragment>
  #include <logdepthbuf_fragment>
  #include <map_fragment>
  #include <color_fragment>
  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <alphahash_fragment>
  #include <specularmap_fragment>
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  #ifdef USE_LIGHTMAP
    vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
    reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
  #else
    reflectedLight.indirectDiffuse += vec3( 1.0 );
  #endif
  #include <aomap_fragment>
  reflectedLight.indirectDiffuse *= diffuseColor.rgb;
  vec3 outgoingLight = reflectedLight.indirectDiffuse;
  #include <envmap_fragment>
  #include <opaque_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}"
   */

  const targetHead = "void main() {";
  const contentHead = /*glsl */`
  #ifndef USE_LIGHTMAP_CONTRAST
  #define USE_LIGHTMAP_CONTRAST
  uniform bool lmContrastOn;
  uniform float lmContrastValue;
  #endif

  vec3 applyGammaCorrection(vec3 color, vec3 gammaFactor) {
    return pow(color, gammaFactor);
  }

  float luminance(vec3 color, float gammaFactor) {
    vec3 corrected = pow(color, vec3(gammaFactor));
    return dot(corrected, vec3(0.2126, 0.7152, 0.0722));
  }

  vec3 adjustContrast(vec3 color, float contrastFactor) {
      // Apply gamma correction to linearize color
      float gammaFactor = 2.2;
      float standard = 0.5;

      color = applyGammaCorrection(color, vec3(gammaFactor)); // Assuming sRGB
      
      // Decompose into reflectance and illumination (simplified Retinex-inspired method)
      float intensity = dot(color, vec3(0.2126, 0.7152, 0.0722)); // Luminance
      // float intensity = dot(color, vec3(1.0, 1.0, 1.0)); // Luminance
      vec3 reflectance = color / (intensity + 0.0001);
      
      // Adjust contrast of reflectance
      reflectance = (reflectance - standard) * contrastFactor + standard;
      
      // Recombine with original intensity
      vec3 adjustedColor = reflectance * intensity * intensity; // 제곱
      
      // Apply inverse gamma correction to return to sRGB
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

  void main() {`;
  parameters.fragmentShader = parameters.fragmentShader.replace(targetHead, contentHead);

  const targetBody = `#include <lights_fragment_maps>`;
  const contentBody = /*glsl */`

  #if defined( RE_IndirectDiffuse )

	#ifdef USE_LIGHTMAP

		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
    vec3 lmcolor = adjustContrast(lightMapTexel.rgb, lmContrastValue);

    
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
  `;
  parameters.fragmentShader = parameters.fragmentShader.replace(targetBody, contentBody);
  // console.log(parameters.fragmentShader)
  // console.log("Mat onBeforeCompile");
}
