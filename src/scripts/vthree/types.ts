import type { Texture, WebGLProgramParametersWithUniforms } from "three";
import type { ProbeTypes } from "../../types";
import type { PlaneControlDirections } from "../CubePlaneControls";
import type ReflectionProbe from "../ReflectionProbe";
import type { ReflectionProbeJSON } from "../ReflectionProbe";
import { THREE } from "./VTHREE";

export type MATERIAL_DEFINE_TYPE = "" | 0 | 1 | true | false;

export type MATERIAL_SHADER = {
  MESH_TRANSITION: {
    type: "MESH_TRANSITION";
    uniforms: {
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
      USE_PROGRESSIVE_ALPHA: MATERIAL_DEFINE_TYPE;
    };
  };
  LIGHTMAP_TRANSITION: {
    type: "LIGHTMAP_TRANSITION";
    uniforms: {
      progress: {
        value: number;
      },
      lightmapTo: {
        value: THREE.Texture;
      },
    },
    defines: {
      USE_LIGHTMAP_TRANSITION: MATERIAL_DEFINE_TYPE;
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
      }
    };
    defines: {
      USE_LIGHTMAP_CONTRAST: MATERIAL_DEFINE_TYPE;
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

export interface ThreeUserData {
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
}

export const MATERIAL_DEFINES = [
  'USE_LIGHTMAP_TRANSITION',
  'USE_PROGRESSIVE_ALPHA',
  'USE_PROGRESSIVE_ALPHA',
  'USE_LIGHTMAP_CONTRAST',

  // multiprobe
  'PROBE_COUNT',
  'WALL_COUNT',

  'MATERIAL_VERSION',
] as const;

export type MATERIAL_DEFINE = typeof MATERIAL_DEFINES[number];