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
    // 벽을 쓰는 프로브
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
      },
      V_CUBEUV_MAX_MIP: { value: number };
      V_CUBEUV_TEXEL_WIDTH: { value: number };
      V_CUBEUV_TEXEL_HEIGHT: { value: number };

      // 벽을 쓰는 프로브일 때만
      uWall?: {
        value: {
          start: THREE.Vector3;
          end: THREE.Vector3;
          index: number; //프로브인덱스
        }[];
      };
      // 벽을 쓰는 프로브일 때만
      uProbeBlendDist?: {
        value: number;
      }
    };
    defines: {
      PROBE_COUNT?: number;
      WALL_COUNT?: number;
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

  isVMaterial?: boolean; // VGLTFLoader로 로드 한 재질
}

export const MATERIAL_DEFINES = [
  "PROBE_COUNT",
  "WALL_COUNT",
  "USE_PROBE_PMREM",
] as const;

export type MATERIAL_DEFINE = typeof MATERIAL_DEFINES[number];

export const EMPTY_TEXTURE = (() => {
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
      PROBE_COUNT: undefined,
      WALL_COUNT: undefined,
    },
    uniforms: {
      // 여기에 기본 키값들을
      //   #1. 넣은 경우, 프로브 할당 전 최초 onBeforeCompile에서 예측할 수 없는 에러 발생, 예를 들어 uProbe:{ value:[] }을 기본값으로 넣어두면 에러 발생
      //   #2. 넣지 않는 경우, onBeforeCompile에서 아래 키 값들을 참조할 수 없음.
      //       밖에서 mat.uniform에 넣은 키들(ex. uProbe)을 순회하면서 shader.uniform에 재할당해야하는데, 이 때 참조할 키값들을 위해 undefined로라도 넣어둔다.
      uProbe: undefined as unknown as any,
      uProbeTextures: undefined as unknown as any,
      uProbeIntensity: undefined as unknown as any,
      V_CUBEUV_MAX_MIP: undefined as unknown as any,
      V_CUBEUV_TEXEL_WIDTH: undefined as unknown as any,
      V_CUBEUV_TEXEL_HEIGHT: undefined as unknown as any,
      uWall: undefined,
      uProbeBlendDist: undefined,
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