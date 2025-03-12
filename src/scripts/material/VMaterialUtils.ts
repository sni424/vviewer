import { THREE } from '../VTHREE.ts';
import { VShaderLib } from './VMaterialConstants.ts';

type Shader = THREE.WebGLProgramParametersWithUniforms;

function adjustLightMapFragments(shader: Shader) {
  // LightMapContrast
  shader.uniforms.lightMapContrast = { value: 1 };

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <lightmap_pars_fragment>',
    VShaderLib.V_LIGHTMAP_PARS_FRAGMENT,
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <lights_fragment_maps>',
    VShaderLib.V_LIGHTS_FRAGMENT_MAPS,
  );
}

function addProgressiveAlpha(shader: Shader) {
  shader.uniforms.progress = { value: 0.0 };
  shader.uniforms.dissolveOrigin = { value: new THREE.Vector3() };
  shader.uniforms.dissolveMaxDist = { value: 0.0 };
  shader.uniforms.dissolveDirection = { value: false };

  shader.fragmentShader =
    `
  uniform float progress;
  uniform vec3 dissolveOrigin;
  uniform float dissolveMaxDist;
  uniform bool dissolveDirection;
  ` + shader.fragmentShader;

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <dithering_fragment>',
    '#include <dithering_fragment>\n' + VShaderLib.V_USE_PROGRESSIVE_ALPHA,
  ); // 마지막에 처리하도록 dithering_fragment 다음에 추가
}

function adjustProjectedEnv(shader: Shader) {
  // TODO Get ReflectionProbe Shader Code
  // TODO 2 원준씨 코드 완성 시 여기에 적용
}

function addWorldPosition(shader: Shader) {
  if (shader.vertexShader.indexOf('varying vec3 wp;') === -1) {
    // 없으면 넣기
    shader.vertexShader =
      VShaderLib.V_VERTEX_WORLD_POSITION + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      `#include <fog_vertex>`,
      `#include <fog_vertex>
      vec4 temp = modelMatrix * vec4( transformed, 1.0 );
      wp = temp.xyz;
    `,
    );
  }

  if (shader.fragmentShader.indexOf('varying vec3 wp;') === -1) {
    shader.fragmentShader = 'varying vec3 wp;\n' + shader.fragmentShader;
  }
}

function addBoxProjectedEnv(
  shader: Shader,
  position: THREE.Vector3,
  size: THREE.Vector3,
) {
  shader.uniforms.envMapPosition = { value: position };
  shader.uniforms.envMapSize = { value: size };

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <envmap_physical_pars_fragment>',
      `
      ${VShaderLib.V_BOX_PROJECTED_ENV}
      #include <envmap_physical_pars_fragment>`,
    )
    .replace(
      '#include <envmap_physical_pars_fragment>',
      THREE.ShaderChunk.envmap_physical_pars_fragment,
    )
    .replace(
      'vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );',
      `
            vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
            ${VShaderLib.getIBLIrradiance_patch}
            `,
    )
    .replace(
      'reflectVec = inverseTransformDirection( reflectVec, viewMatrix );',
      `
            reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
            ${VShaderLib.getIBLRadiance_patch}
            `,
    );
}

export {
  addProgressiveAlpha,
  addWorldPosition,
  adjustLightMapFragments,
  adjustProjectedEnv,
  addBoxProjectedEnv,
};
