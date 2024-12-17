import { extend } from '@react-three/fiber';
import { useAtomValue } from 'jotai';
import { Effect } from 'postprocessing';
import { Uniform } from 'three';
import {
  globalColorManagementAtom,
  LookType,
  ViewTransform,
} from '../../scripts/atoms';

const fragmentShader = /*glsl */ `
  uniform float exposure;
  uniform float gamma;
  uniform int look; // Look type (as an enum int)
  uniform int viewTransform; // View transform type (as an enum int)

  vec3 applyViewTransform(vec3 color, int viewTransform) {
    if (viewTransform == 0) {
      // Standard: Linear to sRGB
      return pow(color, vec3(1.0 / 2.2));
    } else if (viewTransform == 1) {
      // Khronos PBR Neutral
      // Reference: Khronos PBR Neutral Tone Mapper Specification
      float F_90 = 0.04;
      float K_s = 0.8 - F_90;
      float K_d = 0.15;
      vec3 X = max(vec3(0.0), color - K_s);
      vec3 Y = K_s * (1.0 - exp(-X / K_s));
      vec3 Z = K_d * Y;
      return color - Z;
    } else if (viewTransform == 2) {
      // AgX: Placeholder for AgX tone mapping
      // Specific implementation details are not publicly available
      return vec3(0.0);
      return color; // No transformation applied
    } else if (viewTransform == 3) {
      // Filmic: ACES Filmic Tone Mapping
      color = max(vec3(0.0), color - vec3(0.004));
      color = (color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06);
      return pow(color, vec3(1.0 / 2.2));
    } else if (viewTransform == 4) {
      // Filmic Log: Logarithmic encoding
      return log2(1.0 + color) / log2(2.0);
    } else if (viewTransform == 5) {
      // False Color: Map luminance to a color gradient
      float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return vec3(lum); // Simplified; replace with gradient mapping
    } else if (viewTransform == 6) {
      // Raw: No transformation
      return color;
    }
    return color;
  }
  
    
  vec3 applyLook(vec3 color, int look) {
    if (look == 0) {
        // None (No contrast change)
        return color;
    } else if (look == 1) {
        // Very Low Contrast (linear blend to gray)
        color = mix(vec3(0.5), color, 0.25); // Blend towards gray to reduce contrast
    } else if (look == 2) {
        // Low Contrast (mild S-curve)
        color = color * (color * (3.0 * color + 0.2)) / (color * (3.0 * color + 1.2) + 0.05);
    } else if (look == 3) {
        // Medium Contrast (default S-curve)
        color = color * (color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06);
    } else if (look == 4) {
        // High Contrast (steeper S-curve)
        color = color * (color * (9.5 * color + 0.8)) / (color * (9.5 * color + 1.4) + 0.08);
    } else if (look == 5) {
        // Very High Contrast (extreme punchy contrast)
        color = pow(color, vec3(0.65)); // Boost highlights and darken shadows
        color = color * (color * (16.0 * color + 0.5)) / (color * (16.0 * color + 1.7) + 0.06);
    }

    return color;
}

  vec3 applyLook_old(vec3 color, int look) {
    if (look == 0) {
        // Very Low Contrast (flat, no contrast)
        return color;
      } else if (look == 1) {
        // Low Contrast (gentle S-curve)
        color = color * (color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06);
      } else if (look == 2) {
        // Medium Contrast (default S-curve)
        color = color * (color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06);
        color = mix(color, pow(color, vec3(0.9)), 0.5); // Slight mix with power
      } else if (look == 3) {
        // High Contrast (steeper S-curve)
        color = color * (color * (6.2 * color + 0.5)) / (color * (6.2 * color + 1.7) + 0.06);
        color = pow(color, vec3(0.8));
      } else if (look == 4) {
        // Very High Contrast (extreme S-curve)
        color = color * (color * (16.0 * color + 0.5)) / (color * (16.0 * color + 1.7) + 0.06);
      }
  
      return color;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 color = texture2D(inputBuffer, uv);
    // Apply exposure
    color.rgb *= pow(2.0, exposure);

    color.rgb = applyViewTransform(color.rgb, viewTransform);

    // Apply Look (using the look enum)
    color.rgb = applyLook(color.rgb, look);

    // Apply gamma correction
    color.rgb = pow(color.rgb, vec3(1.0 / gamma));
    outputColor = vec4(color.rgb, color.a);
  }
`;

class GlobalColorManagementEffect extends Effect {
  constructor({
    exposure = 0.0,
    gamma = 2.2,
    look = LookType.MEDIUM_CONTRAST, // Default Look setting
    viewTransform = ViewTransform.Standard, // Default View Transform setting
  }: {
    exposure?: number;
    gamma?: number;
    look?: LookType;
    viewTransform?: ViewTransform;
  }) {
    super('ColorManagementShader', fragmentShader, {
      uniforms: new Map([
        ['exposure', new Uniform(exposure)],
        ['gamma', new Uniform(gamma)],
        ['look', new Uniform(Object.values(LookType).indexOf(look))], // Map Look enum to index
        [
          'viewTransform',
          new Uniform(Object.values(ViewTransform).indexOf(viewTransform)),
        ], // Map View Transform enum to index
      ]),
    });
  }
}

extend({ GlobalColorManagementEffect });

function GlobalColorManagement() {
  const { on, value } = useAtomValue(globalColorManagementAtom);

  if (!on || !value) {
    return null;
  }

  console.log(value);
  const customEffect = new GlobalColorManagementEffect(value);

  return <primitive object={customEffect} />;
}

export default GlobalColorManagement;
