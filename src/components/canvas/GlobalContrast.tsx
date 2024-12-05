import React, { useMemo } from 'react';
import { EffectComposer } from '@react-three/postprocessing';
import { Uniform } from 'three';
import { extend } from '@react-three/fiber';
import { Effect, BlendFunction } from 'postprocessing';
import { useAtomValue } from 'jotai';
import { globalContrastAtom } from '../../scripts/atoms';

class CustomEffect extends Effect {
    constructor({ contrast = 1.5 } = {}) {
        super(
            'CustomEffect',
            `
          uniform sampler2D tDiffuse;
          uniform float uContrast;
  
          vec3 adjustContrast(vec3 color, float contrast) {
            // Sigmoid-based contrast adjustment
            contrast = contrast + 1.0;
            color = clamp(color, 0.0, 1.0); // Ensure color stays in [0, 1]
            color = (color - 0.5) * contrast + 0.5; // Scale and re-center color
            color = smoothstep(0.0, 1.0, color);   // Smooth results using a sigmoid-like function
            return color;
        }
  
          void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
            vec4 color = texture2D(tDiffuse, uv);
            
            // Check the alpha value to determine if the fragment is background
            if (color.a < 0.01) { // Background threshold
                outputColor = color; // Skip contrast adjustment for the background
            } else {
                color.rgb = adjustContrast(color.rgb, uContrast); // Apply contrast adjustment
                outputColor = vec4(color.rgb, color.a);
            }
          }
        `,
            {
                blendFunction: BlendFunction.NORMAL, // How the effect blends with the scene
                uniforms: new Map([['uContrast', new Uniform(contrast)]]),
            }
        );
    }
}

// Extend the custom effect
extend({ CustomEffect });

const GlobalContrast = () => {
    const { on, value: globalContrastValue } = useAtomValue(globalContrastAtom);

    if (!on) {
        return null;
    }

    const customEffect = new CustomEffect({ contrast: globalContrastValue })

    return <EffectComposer>
        <primitive object={customEffect} />
    </EffectComposer>

}

export default GlobalContrast;