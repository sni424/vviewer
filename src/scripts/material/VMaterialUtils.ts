import { THREE } from '../VTHREE.ts';
import * as MaterialConstants from './VMaterialConstants.ts';

type Shader = THREE.WebGLProgramParametersWithUniforms;

function adjustLightMapFragments(shader: Shader) {
  // LightMapContrast
  shader.uniforms.lightMapContrast = { value: 1 };

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <lightmap_pars_fragment>',
    MaterialConstants.VShaderLib.V_LIGHTMAP_PARS_FRAGMENT,
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <lights_fragment_maps>',
    MaterialConstants.VShaderLib.V_LIGHTS_FRAGMENT_MAPS,
  );
}

function adjustProjectedEnv(shader: Shader) {
  // TODO Get ReflectionProbe Shader Code
  // TODO 2 원준씨 코드 완성 시 여기에 적용
}

function addWorldPosition(shader: Shader) {
  console.log('addWorld position');
  shader.vertexShader =
    MaterialConstants.VShaderLib.V_VERTEX_WORLD_POSITION + shader.vertexShader;
}

export { addWorldPosition, adjustLightMapFragments, adjustProjectedEnv };
