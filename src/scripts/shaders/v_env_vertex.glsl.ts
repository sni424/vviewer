import { THREE } from 'VTHREE';

type Shader = THREE.WebGLProgramParametersWithUniforms;

const header = /* glsl */ `
#ifndef V_VERTEX_HEADER_GUARD
#define V_VERTEX_HEADER_GUARD

#if defined(PROBE_COUNT) || defined(USE_PROGRESSIVE_ALPHA)
varying vec3 vWorldPosition;
#endif //!V_ENV_MAP || USE_PROGRESSIVE_ALPHA

#endif //!V_VERTEX_HEADER_GUARD
`

const contentTarget = /*glsl */`#include <worldpos_vertex>`;
const content = /* glsl */ `
#ifndef V_VERTEX_CONTENT_GUARD
#define V_VERTEX_CONTENT_GUARD

#if defined(PROBE_COUNT) || defined(USE_PROGRESSIVE_ALPHA)
  vWorldPosition = (modelMatrix * vec4( transformed, 1.0 )).xyz;
#endif
#include <worldpos_vertex>

#endif //!V_VERTEX_CONTENT_GUARD
`

export const patchVertex = (shader: Shader) => {

  // 1. header
  shader.vertexShader = header + shader.vertexShader;

  // 2. content
  shader.vertexShader = shader.vertexShader.replace(contentTarget, content);

  return shader;
}

export const v_env_vertex_shaders = {
  header,
  content,
  contentTarget
}