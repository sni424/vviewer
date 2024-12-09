import { EffectComposer } from '@react-three/postprocessing';
import { Uniform } from 'three';
import { extend } from '@react-three/fiber';
import { Effect, BlendFunction } from 'postprocessing';
import { useAtomValue } from 'jotai';
import { globalContrastAtom, globalSaturationCheckAtom } from '../../scripts/atoms';

const shader = /* glsl */`
    uniform sampler2D tDiffuse;


    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec4 color = texture2D(tDiffuse, uv);
        
        // color.rgb = adjustContrast(color.rgb, uContrast); // Apply contrast adjustment
        if(color.r <= 1.0){
            color.r = 0.0;
        } else {
            color.r = 1.0;
        }
        if(color.g <= 1.0){
            color.g = 0.0;
        }else {
            color.g = 1.0;
        }
        if(color.b <= 1.0){
            color.b = 0.0;
        } else {
            color.b = 1.0;
        }

        outputColor = vec4(color.rgb, color.a);
    }
`;

class GlobalSaturactionCheckEffect extends Effect {
    constructor() {
        super(
            'GlobalSaturactionCheckEffect',
            shader,
            {
                blendFunction: BlendFunction.NORMAL, // How the effect blends with the scene
                // uniforms: new Map([['uContrast', new Uniform(contrast)]]),
                // uniforms: new Map([['uContrast', new Uniform(1)]]),
            }
        );
    }
}

// Extend the custom effect
extend({ GlobalSaturactionCheckEffect });

const GlobalSaturationCheck = () => {
    const on = useAtomValue(globalSaturationCheckAtom);

    if (!on) {
        return null;
    }

    const customEffect = new GlobalSaturactionCheckEffect()

    return <EffectComposer>
        <primitive object={customEffect} />
    </EffectComposer>

}

export default GlobalSaturationCheck;