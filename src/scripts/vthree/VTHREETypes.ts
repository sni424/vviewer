import type { Texture, WebGLProgramParametersWithUniforms } from "three";
import { THREE } from 'VTHREE';
import type { ProbeTypes } from "../../types";
import type { PlaneControlDirections } from "../CubePlaneControls";
import type ReflectionProbe from "../ReflectionProbe";
import type { ReflectionProbeJSON } from "../ReflectionProbe";

export type MATERIAL_DEFINE_TYPE = "" | 0 | 1 | true | false;

export type MATERIAL_SHADER = {
  MESH_TRANSITION: {
    type: "MESH_TRANSITION";
    uniforms: {
      MESH_TRANSITION: { value: boolean };
      progress: {
        value: number;
      };
      dissolveOrigin: {
        value: THREE.Vector3;
      };
      dissolveMaxDist: {
        value: number;
      };
      dissolveDirection: {
        value: boolean;
      }
    };
    defines: {
    };
  };
  LIGHTMAP_TRANSITION: {
    type: "LIGHTMAP_TRANSITION";
    uniforms: {
      LIGHTMAP_TRANSITION: { value: boolean };
      progress: {
        value: number;
      },
      lightMapTo: {
        value: THREE.Texture;
      },
    },
    defines: {
    },
  };
  PROBE: {
    type: "PROBE";
    uniforms: {
      uProbe: {
        value: {
          center: THREE.Vector3;
          size: THREE.Vector3;
        }[];
      };
      uProbeTextures: {
        value: THREE.Texture[];
      };
      uProbeIntensity: {
        value: number;
      }
    };
    defines: {
      PROBE_COUNT: number;
      V_ENVMAP_TYPE_CUBE_UV: number;
      V_CUBEUV_MAX_MIP: string;
      V_CUBEUV_TEXEL_WIDTH: number;
      V_CUBEUV_TEXEL_HEIGHT: number;
    };
  };
  PROBE_WALL: {
    type: "PROBE_WALL",
    uniforms: {
      uProbe: {
        value: {
          center: THREE.Vector3;
          size: THREE.Vector3;
        }[];
      };
      uProbeTextures: {
        value: THREE.Texture[];
      };
      uProbeIntensity: {
        value: number;
      };
      uWall: {
        value: {
          start: THREE.Vector3;
          end: THREE.Vector3;
          index: number; //프로브인덱스
        }[];
      };
      uProbeBlendDist: {
        value: number;
      }
    };
    defines: {
      PROBE_COUNT: number;
      V_ENVMAP_TYPE_CUBE_UV: number;
      V_CUBEUV_MAX_MIP: string;
      V_CUBEUV_TEXEL_WIDTH: number;
      V_CUBEUV_TEXEL_HEIGHT: number;
      WALL_COUNT: number;
    };
  };
  LIGHTMAP_CONTRAST: {
    type: "LIGHTMAP_CONTRAST";
    uniforms: {
      lightMapContrast: {
        value: number;
      };
      globalLightMapContrast: {
        value: number;
      }
    };
    defines: {
    }
  }
};

export type MATERIAL_UNIFORM_VALUE<K extends string> = {
  [ShaderKey in keyof MATERIAL_SHADER]:
  K extends keyof MATERIAL_SHADER[ShaderKey]['uniforms']
  ? MATERIAL_SHADER[ShaderKey]['uniforms'][K] extends { value: infer V }
  ? V
  : never
  : never;
}[keyof MATERIAL_SHADER];


export type MATERIAL_UNIFORM = {
  [K in keyof MATERIAL_SHADER]: keyof MATERIAL_SHADER[K]["uniforms"];
}[keyof MATERIAL_SHADER];



export type MATERIAL_SHADER_TYPE = keyof MATERIAL_SHADER;

export interface VUserData {
  lightMap?: string; // filename
  lightMapIntensity?: number;
  probe?: ReflectionProbe;
  isTransformControls?: boolean;
  isProbeMesh?: boolean;
  probeId?: string;
  probeIds?: string[];
  probeType?: ProbeTypes;
  probeMeshType?: 'box' | 'controls' | 'sphere' | 'helper' | 'plane-controls';
  probeControlDirection?: PlaneControlDirections;
  probes?: ReflectionProbeJSON[];
  hotspotIndex?: number;
  isExr?: boolean;
  mimeType?: 'image/ktx2' | 'probe-captured-image'; // ktx2압축시 달려있음
  modelType?: 'DP' | 'BASE';
  dpOnLightMap?: Texture;
  dpOffLightMap?: Texture;
  dpOnTextureFile?: string;
  dpOffTextureFile?: string;
  // optional
  dpOnLightMapIntensity?: number;
  dpOffLightMapIntensity?: number;
  isCustomEnvMap?: boolean;
  originalOpacity?: number;
  shader?: WebGLProgramParametersWithUniforms;
  isMobile?: boolean;
  originalColor?: string;

  // visibility transition
  dissolveOrigin?: THREE.Vector3;
  dissolveMaxDist?: number;

  // lightmap transition때 쓰이는 빈 텍스쳐
  isEmptyTexture?: boolean;
}

export const MATERIAL_DEFINES = [
  'LIGHTMAP_TRANSITION',
  'MESH_TRANSITION',
  'MESH_TRANSITION',
  'USE_LIGHTMAP_CONTRAST',

  // multiprobe
  'PROBE_COUNT',
  'WALL_COUNT',

  'MATERIAL_VERSION',
] as const;

export type MATERIAL_DEFINE = typeof MATERIAL_DEFINES[number];

const EMPTY_TEXTURE = (() => {
  const emptyTexture = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 0]), // transparent 1x1 pixel
    1,
    1,
    THREE.RGBAFormat
  );
  emptyTexture.needsUpdate = true;
  return emptyTexture;
})();
export const DEFAULT_MATERIAL_SHADER: MATERIAL_SHADER = {
  MESH_TRANSITION: {
    type: "MESH_TRANSITION",
    defines: {
    },
    uniforms: {
      MESH_TRANSITION: { value: false },
      progress: { value: 0 },
      dissolveOrigin: { value: new THREE.Vector3() },
      dissolveMaxDist: { value: 0 },
      dissolveDirection: { value: false },
    }
  },

  LIGHTMAP_TRANSITION: {
    type: "LIGHTMAP_TRANSITION",
    defines: {
    },
    uniforms: {
      LIGHTMAP_TRANSITION: { value: false },
      progress: { value: 0 },
      lightMapTo: {
        value: EMPTY_TEXTURE
      },
    }
  },

  PROBE: {
    type: "PROBE",
    defines: {
      PROBE_COUNT: 0,
      V_CUBEUV_MAX_MIP: "0.0",
      V_ENVMAP_TYPE_CUBE_UV: 0,
      V_CUBEUV_TEXEL_WIDTH: 0,
      V_CUBEUV_TEXEL_HEIGHT: 0,
    },
    uniforms: {
      uProbe: { value: [] },
      uProbeTextures: { value: [] },
      uProbeIntensity: { value: 1.0 },
    },
  },
  PROBE_WALL: {
    type: "PROBE_WALL",
    defines: {
      PROBE_COUNT: 0,
      WALL_COUNT: 0,
      V_CUBEUV_MAX_MIP: "0.0",
      V_ENVMAP_TYPE_CUBE_UV: 0,
      V_CUBEUV_TEXEL_WIDTH: 0,
      V_CUBEUV_TEXEL_HEIGHT: 0,
    },
    uniforms: {
      uProbe: { value: [] },
      uProbeTextures: { value: [] },
      uProbeIntensity: { value: 1.0 },
      uProbeBlendDist: { value: 20.0 },
      uWall: { value: [] },
    },
  },
  LIGHTMAP_CONTRAST: {
    type: "LIGHTMAP_CONTRAST",
    uniforms: {
      lightMapContrast: { value: 1 },
      globalLightMapContrast: { value: 1 },
    },
    defines: {
    }
  },
};

export const defaultUniforms: { [uniform in MATERIAL_UNIFORM]: { value: MATERIAL_UNIFORM_VALUE<uniform> } } = (() => {
  const uniforms: any = {};
  for (const shaderKey in DEFAULT_MATERIAL_SHADER) {
    const shader = DEFAULT_MATERIAL_SHADER[shaderKey as keyof MATERIAL_SHADER];
    for (const uniformKey in shader.uniforms) {
      uniforms[uniformKey] = shader.uniforms[uniformKey as keyof typeof shader.uniforms];
    }
  }
  return uniforms;
})() as any;

export const MATERIAL_UNIFORMS: MATERIAL_UNIFORM[] = (() => {
  return Object.keys(defaultUniforms) as MATERIAL_UNIFORM[];
})() as any;