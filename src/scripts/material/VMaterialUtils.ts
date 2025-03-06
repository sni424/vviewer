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

function addAlphaFunction(shader: Shader) {
  const ditheringReplace = `
  #include <dithering_fragment>
  #ifdef USE_PROGRESSIVE_ALPHA
    float distance = distance(wp.xyz, dissolveOrigin );
    float falloffRange = dissolveMaxDist * 0.01;
    float distToBorder = (dissolveMaxDist + falloffRange) * abs(progress);
    float falloff = step( distToBorder-falloffRange, distance );
    float glowFalloff;
    if ( dissolveDirection ) {
        falloff = 1.0 - falloff;
        glowFalloff = 1.0 - smoothstep(distToBorder-falloffRange*5.0, distToBorder+falloffRange*4.0, distance);
  
    }
    else {
        glowFalloff = smoothstep(distToBorder-falloffRange, distToBorder, distance);
    }
    gl_FragColor.a *= falloff;
    vec3 glowColor = vec3(0.31, 0.53, 0.88);
    gl_FragColor.rgb = mix(glowColor, gl_FragColor.rgb, glowFalloff);
  #endif
`;
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
    'void main()',
    VShaderLib.V_ALPHA_MIX_FUNC,
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <dithering_fragment>',
    ditheringReplace,
  );

  // shader.fragmentShader = shader.fragmentShader.replace(
  //   '#include <premultiplied_alpha_fragment>',
  //   '',
  // );
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

    shader.fragmentShader = 'varying vec3 wp;\n' + shader.fragmentShader;
  }
}

export {
  addAlphaFunction,
  addWorldPosition,
  adjustLightMapFragments,
  adjustProjectedEnv,
};
