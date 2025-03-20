import { extend } from '@react-three/fiber';
import { BlendFunction, Effect } from 'postprocessing';
import { Uniform } from 'three';
import { DEFAULT_COLOR_TEMPERATURE } from '../../Constants';
import OptionBuilder, { OptionTransformer } from '../../scripts/OptionBuilder';

const colorTemperatureShader = /* glsl */ `
    #ifndef USE_COLOR_TEMPERATURE
    #define USE_COLOR_TEMPERATURE
    uniform sampler2D tDiffuse;
    uniform float uTemperature; // Temperature in Kelvin
    #endif

    vec3 kelvinToRGB(float kelvin) {
    float temp = kelvin / 100.0;
    float r, g, b;

    if (temp <= 66.0) {
        r = 255.0;
        g = temp - 2.0;
        g = 99.4708025861 * log(g) - 161.1195681661;
        if (temp <= 19.0) {
        b = 0.0;
        } else {
        b = temp - 10.0;
        b = 138.5177312231 * log(b) - 305.0447927307;
        }
    } else {
        r = temp - 60.0;
        r = 329.698727446 * pow(r, -0.1332047592);
        g = temp - 60.0;
        g = 288.1221695283 * pow(g, -0.0755148492);
        b = 255.0;
    }

    return clamp(vec3(r, g, b) / 255.0, 0.0, 1.0);
    }

    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec4 color = texture2D(tDiffuse, vUv);
        vec3 temperatureRGB = kelvinToRGB(uTemperature);
        color.r = color.r * temperatureRGB.r;
        color.g = color.g * temperatureRGB.g;
        color.b = color.b * temperatureRGB.b;
        outputColor = vec4(color.rgb, color.a);
    }
`;

class GlobalColorTemperatureEffect extends Effect {
  constructor(uTemperature: number) {
    super('GlobalColorTemperatureEffect', colorTemperatureShader, {
      blendFunction: BlendFunction.NORMAL, // How the effect blends with the scene
      uniforms: new Map([['uTemperature', new Uniform(uTemperature)]]),
      // uniforms: new Map([['uContrast', new Uniform(1)]]),
    });
  }
}

// Extend the custom effect
extend({ GlobalColorTemperatureEffect });

const defaultColorTemperatureOption: { [key in string]: OptionTransformer } = {
  value: {
    label: '온도',
    type: 'number',
    value: DEFAULT_COLOR_TEMPERATURE,
    min: 4800,
    max: 8400,
    step: 1,
  },
} as const;

const ColorTemperatureEffect = ({ value }: { value: number }) => {
  const customEffect = new GlobalColorTemperatureEffect(value);

  return <primitive object={customEffect} />;
};

export const {
  Component: ColorTemperature,
  Controller: ColorTemperatureOption,
  // atom: globalColorTemperatureAtom,
} = OptionBuilder(
  '색온도',
  //@ts-ignore
  <ColorTemperatureEffect />,
  defaultColorTemperatureOption,
);
