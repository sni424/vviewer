import { extend } from '@react-three/fiber';
import { useAtomValue } from 'jotai';
import { BlendFunction, Effect } from 'postprocessing';
import { globalSaturationCheckAtom } from '../../scripts/atoms';

const shader = /* glsl */ `
    uniform sampler2D tDiffuse;


    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec4 color = texture2D(tDiffuse, uv);

        // 배경은 다 까만색으로
        if(color.a < 0.01){
            outputColor = vec4(vec3(0.0), 1.0);
            return;
        }

        color.rgb = vec3(0.5, 0.5, 0.5);
        
        if(inputColor.r <= 1.0){
            color.r = 0.0;
        } else {
            color.r = 1.0;
        }
        if(inputColor.g <= 1.0){
            color.g = 0.0;
        }else {
            color.g = 1.0;
        }
        if(inputColor.b <= 1.0){
            color.b = 0.0;
        } else {
            color.b = 1.0;
        }
        
        outputColor = vec4(color.rgb, color.a);
    }
`;

class GlobalSaturactionCheckEffect extends Effect {
  constructor() {
    super('GlobalSaturactionCheckEffect', shader, {
      blendFunction: BlendFunction.NORMAL, // How the effect blends with the scene
      // uniforms: new Map([['uContrast', new Uniform(contrast)]]),
      // uniforms: new Map([['uContrast', new Uniform(1)]]),
    });
  }
}

// Extend the custom effect
extend({ GlobalSaturactionCheckEffect });

const GlobalSaturationCheck = () => {
  const on = useAtomValue(globalSaturationCheckAtom);

  if (!on) {
    return null;
  }

  const customEffect = new GlobalSaturactionCheckEffect();

  return <primitive object={customEffect} />;
};

export default GlobalSaturationCheck;
