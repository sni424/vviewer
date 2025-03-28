import { THREE } from 'VTHREE';

type Shader = THREE.WebGLProgramParametersWithUniforms;

const header = /* glsl */ `
#ifndef V_VERTEX_HEADER_GUARD
#define V_VERTEX_HEADER_GUARD

varying vec3 vWorldPos;

#endif //!V_VERTEX_HEADER_GUARD
`

const contentTarget = /*glsl */`#include <worldpos_vertex>`;
const content = /* glsl */ `
#ifndef V_VERTEX_CONTENT_GUARD
#define V_VERTEX_CONTENT_GUARD

  vWorldPos = (modelMatrix * vec4( transformed, 1.0 )).xyz;
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