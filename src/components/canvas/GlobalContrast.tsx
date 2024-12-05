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
            return (color - 0.5) * contrast + 0.5;
          }
  
          void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
            vec4 color = texture2D(tDiffuse, uv);
            color.rgb = adjustContrast(color.rgb, uContrast);
            outputColor = vec4(color.rgb, 1.0);
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
    const globalContrastValue = useAtomValue(globalContrastAtom);

    if (typeof globalContrastValue !== "number") {
        return null;
    }

    const customEffect = new CustomEffect({ contrast: globalContrastValue })

    return <EffectComposer>
        <primitive object={customEffect} />
    </EffectComposer>

}

export default GlobalContrast;