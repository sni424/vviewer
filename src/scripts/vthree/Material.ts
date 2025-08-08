import * as THREE from 'three';
import {
  DEFAULT_MATERIAL_SHADER,
  defaultUniforms,
  EMPTY_TEXTURE,
  MATERIAL_DEFINE,
  MATERIAL_SHADER,
  MATERIAL_UNIFORM,
  MATERIAL_UNIFORM_VALUE,
  VUserData,
} from '../../scripts/vthree/VTHREETypes';
import { threes } from '../atomUtils';
import { getProbeSize } from '../probeUtils';
import type ReflectionProbe from '../ReflectionProbe';
import { patchFragment } from '../shaders/v_env_frag.glsl';
import { patchVertex } from '../shaders/v_env_vertex.glsl';
import { computeBoundingBoxForMaterial } from '../utils';

export type MaterialDefines = { [key in MATERIAL_DEFINE]?: any };

export const applyProbeDefaultValues: Pick<
  Record<MATERIAL_UNIFORM, any>,
  'uProbeIntensity' | 'uProbeContrast' | 'uProbeBlendDist'
> = {
  uProbeIntensity: 1.0,
  uProbeContrast: 1.0,
  uProbeBlendDist: 20.0,
} as const;
export type applyProbeDefaultValues = keyof typeof applyProbeDefaultValues;

export type applyProbeReflectionProbe = {
  probes: ReflectionProbe[];
  texture: THREE.Texture;
  resolution: number;

  walls?: {
    start: THREE.Vector3;
    end: THREE.Vector3;
    probeId: string;
  }[];
  probeIntensity?: number; // default : 1.0
  probeContrast?: number; // default : 1.0
};

export type applyProbeGeneral = {
  probeBoxes: {
    center: THREE.Vector3;
    size: THREE.Vector3;
  }[];
  probeTextures: THREE.Texture[];
  probeResolution?: number;
  textureType?: 'pmrem' | 'cubemap'; // default : "pmrem"
  walls?: {
    start: THREE.Vector3;
    end: THREE.Vector3;
    index: number; // 앞의 박스/텍스쳐의 프로브 인덱스
  }[];
  probeIntensity?: number; // default : 1.0
  probeContrast?: number; // default : 1.0
};

export type MaterialApplyType = {
  meshTransition: {
    direction: 'fadeIn' | 'fadeOut';
    progress?: number; // default : 0
    useMeshTrantision?: boolean; // default : true, 유니폼의 MESH_TRANSITION을 설정할것인가
    scene?: THREE.Scene; // undefined면 threeExports 사용
  };
  lightmapTransition: {
    target: THREE.Texture; // 나로부터 target으로
    progress?: number; // default : 0
  };
  probe: applyProbeReflectionProbe | applyProbeGeneral;
  lightmapContrast: number;
  progress: number;
  brightnessContrast: {
    uBrightnessValue: number;
    uContrastValue: number;
    uUseBrightnessValue: boolean;
  };
  highlightBurn: {
    uUseHighlightBurn: boolean;
    highlightBurnFactor: number;
  };
  whiteBalance: {
    uUseWhiteBalance: boolean;
    uWhiteBalance: number;
  };
  saturation: {
    uUseSaturation: boolean;
    uSaturation: number;
  };
};

declare module 'three' {
  interface Material {
    get basic(): THREE.MeshBasicMaterial;
    get standard(): THREE.MeshStandardMaterial;
    get physical(): THREE.MeshPhysicalMaterial;

    get vUserData(): VUserData;

    set vUserData(userData: Partial<VUserData>);

    // get/set, this.uniform.progress.value를 변화시킴
    get progress(): number;
    set progress(value: number);

    // mat을 쓰는 모든 메시의 바운딩박스와 dissolve 관련 유니폼 준비
    // fadeOut = fale
    // fadeIn = true
    prepareMeshTransition(params: {
      direction: 'fadeIn' | 'fadeOut';
      progress?: number; // default : 0
      useMeshTrantision?: boolean; // default : true, 유니폼의 MESH_TRANSITION을 설정할것인가
      scene?: THREE.Scene; // undefined면 threeExports 사용
    }): void;

    applyProbe(params: applyProbeReflectionProbe): void;

    apply<T extends keyof MaterialApplyType>(
      key: T,
      params?: MaterialApplyType[T],
    ): void;
    remove<T extends keyof MaterialApplyType>(key: T): void;

    updateMultiProbeTexture?(): void;

    // getter, 셰이더를 사용하는 경우 할당되는 유니폼
    //! uniforms를 쓰는 재질이 있으므로 중복 방지를 위해 단수형
    uniform: {
      [uniform in MATERIAL_UNIFORM]: { value: MATERIAL_UNIFORM_VALUE<uniform> };
    };
    upsertUniform(key: MATERIAL_UNIFORM, value: any): this;

    // defines?: MaterialDefines;
    setDefines(defines: Partial<MaterialDefines>): this;
    addDefines(defines: Partial<MaterialDefines>): this;
    setDefine(key: MATERIAL_DEFINE, value?: any): this;
    removeDefine(key: MATERIAL_DEFINE): this;

    // onBeforCompile이 불리는 시점에 유니폼들 삭제
    removeUniform(...key: MATERIAL_UNIFORM[]): this;
    _removeUniform: MATERIAL_UNIFORM[];
  }
}

THREE.Material.prototype.removeUniform = function (...key: MATERIAL_UNIFORM[]) {
  if (!this._removeUniform) {
    this._removeUniform = [];
  }
  this._removeUniform.push(...key);

  if (this._removeUniform.length > 0) {
    this.needsUpdate = true;
  }

  return this;
};

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'basic')) {
  Object.defineProperty(THREE.Material.prototype, 'basic', {
    get() {
      return this as THREE.MeshBasicMaterial;
    },
    set() {
      return this as THREE.MeshBasicMaterial;
    },
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'standard')) {
  Object.defineProperty(THREE.Material.prototype, 'standard', {
    get() {
      return this as THREE.MeshStandardMaterial;
    },
    set() {
      return this as THREE.MeshStandardMaterial;
    },
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'physical')) {
  Object.defineProperty(THREE.Material.prototype, 'physical', {
    get() {
      return this as THREE.MeshPhysicalMaterial;
    },
    set() {
      return this as THREE.MeshPhysicalMaterial;
    },
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'progress')) {
  Object.defineProperty(THREE.Material.prototype, 'progress', {
    get() {
      if (this.uniform?.uProgress?.value !== undefined) {
        return this.uniform.uProgress.value;
      } else {
        console.warn('머티리얼 유니폼/프로그레스 없음 : ', this.name);
        return 0;
      }
    },
    set(value: number) {
      if (typeof this.uniform?.uProgress !== undefined) {
        this.uniform.uProgress.value = value;
      } else {
        console.warn('머티리얼 유니폼/프로그레스 없음 : ', this.name);
      }
    },
  });
}

THREE.Material.prototype.upsertUniform = function (
  key: MATERIAL_UNIFORM,
  value: any,
) {
  if (!this.uniform) {
    this.uniform = { [key]: { value } } as any;
  } else {
    if (this.uniform[key]) {
      this.uniform[key].value = value;
    } else {
      this.uniform[key] = { value } as any;
    }
  }
  return this;
};

THREE.Material.prototype.uniform = (() => {
  DEFAULT_MATERIAL_SHADER;
})() as any;

// 유니폼 업서트
const upsert = (uniform: any, key: string, value: any) => {
  try {
    uniform[key].value = value;
  } catch {
    uniform[key] = { value };
  }
};
let compiled = 0;
THREE.Material.prototype.onBeforeCompile = function (
  shader: THREE.WebGLProgramParametersWithUniforms,
  renderer: THREE.WebGLRenderer,
) {
  console.log('onBeforeCompile', this.name, this.type, ++compiled);
  if (!this.vUserData.isVMaterial) {
    return;
  }

  // console.log('onBeforeCompile', this.name, this.type);

  patchVertex(shader);
  patchFragment(shader);

  // 첫 컴파일 시 default 유니폼 할당
  const possibleUniforms = [
    ...Object.keys(defaultUniforms),
  ] as MATERIAL_UNIFORM[];
  for (const key of possibleUniforms) {
    // console.log(`   (this.uniform as any)?.[${key}]?.value : `, (this.uniform as any)?.[key]?.value);

    // 밖에서 넣어준 uniform을 재할당
    const value =
      (this.uniform as any)?.[key]?.value ??
      (defaultUniforms as any)[key]?.value;

    if (typeof value !== 'undefined') {
      // console.log("   onBeforeCompile", key, value);
      upsert(shader.uniforms, key, value);
    }
  }

  // if (this.name.includes('laminate')) {
  //   debugger;
  // }

  // remove uniforms
  if (!this._removeUniform) {
    this._removeUniform = [];
  }
  for (const key of this._removeUniform) {
    delete shader.uniforms[key];
  }
  this._removeUniform = [];

  // 컴파일 시 this.uniform 호출 가능
  // console.log('before insert uniform');
  this.uniform = shader.uniforms as any;
  // console.log('after insert uniform ', this.uniform);
};

THREE.Material.prototype.setDefines = function (
  defines: Partial<MaterialDefines>,
) {
  this.defines = defines;
  return this;
};

THREE.Material.prototype.addDefines = function (
  defines: Partial<MaterialDefines>,
) {
  if (!this.defines) {
    this.defines = {};
  }

  for (const key in defines) {
    if ((defines as any)[key] !== undefined) {
      this.defines[key] = (defines as any)[key];
    }
  }

  return this;
};

THREE.Material.prototype.setDefine = function (
  key: MATERIAL_DEFINE,
  value: any = '',
) {
  if (!this.defines) {
    this.defines = {};
  }
  this.defines[key] = value;
  return this;
};

THREE.Material.prototype.removeDefine = function (key: MATERIAL_DEFINE) {
  if (!this.defines) {
    this.defines = {};
  }
  delete this.defines[key];
  return this;
};

// vUserData
if (
  !Object.prototype.hasOwnProperty.call(THREE.Material.prototype, 'vUserData')
) {
  Object.defineProperty(THREE.Material.prototype, 'vUserData', {
    get: function () {
      return this.userData as VUserData;
    },
    set: function (userData: Partial<VUserData>) {
      this.userData = { ...this.userData, ...userData };
    },
  });
}

THREE.Material.prototype.prepareMeshTransition = function (params: {
  direction: 'fadeIn' | 'fadeOut';
  progress?: number; // default : 0
  useMeshTrantision?: boolean; // default : true
  scene?: THREE.Scene;
}) {
  const { scene, direction, progress, useMeshTrantision } = params;

  if (
    typeof this.vUserData.dissolveOrigin === 'undefined' ||
    typeof this.vUserData.dissolveMaxDist === 'undefined'
  ) {
    const targetScene = scene ?? threes()?.scene;
    if (!targetScene) {
      console.warn('prepareMeshTransition : scene 없음', this.name, this);
      return;
    }

    const box = computeBoundingBoxForMaterial(targetScene, this)!;

    if (!box) {
      console.warn(
        'prepareMeshTransition : bounding box 없음',
        this.name,
        this,
      );
      return;
    }

    // dissolveOrigin 설정: x는 minX, y는 중앙, z는 minZ
    const minX = box.min.x; // 왼쪽 X 좌표
    const centerY = (box.min.y + box.max.y) / 2; // Y 중앙
    const minZ = box.min.z; // 가장 앞쪽 (액자의 왼쪽 테두리)
    const maxX = box.max.x;
    const maxZ = box.max.z;

    // dissolveOrigin을 Three.js Vector3로 설정
    // const dissolveOrigin = direction === 'fadeIn' ?  new THREE.Vector3(minX, centerY, minZ) : new THREE.Vector3(maxX, centerY, maxZ);
    const dissolveOrigin =
      direction === 'fadeIn'
        ? new THREE.Vector3(minX, centerY, minZ)
        : new THREE.Vector3(maxX, centerY, maxZ);

    const dissolveMaxDist = box.max.distanceTo(box.min);

    this.vUserData.dissolveOrigin = dissolveOrigin;
    this.vUserData.dissolveMaxDist = dissolveMaxDist;
  }

  // uniform 세팅
  const mat = this;
  if (mat && mat.uniform) {
    if (!mat.uniform.uDissolveOrigin) {
      mat.uniform.uDissolveOrigin = { value: this.vUserData.dissolveOrigin };
    } else {
      mat.uniform.uDissolveOrigin.value = this.vUserData.dissolveOrigin;

      // 아래처럼 값을 복사하면 Vector3가 새로 바인딩이 되지 않는다
      // mat.uniform.dissolveOrigin.value.copy(this.vUserData.dissolveOrigin);
    }

    if (!mat.uniform.uDissolveMaxDist) {
      mat.uniform.uDissolveMaxDist = { value: this.vUserData.dissolveMaxDist };
    } else {
      mat.uniform.uDissolveMaxDist.value = this.vUserData.dissolveMaxDist;
    }

    const directionValue = direction === 'fadeIn' ? true : false;
    if (!mat.uniform.uDissolveDirection) {
      mat.uniform.uDissolveDirection = { value: directionValue };
    } else {
      if (typeof direction !== 'undefined') {
        mat.uniform.uDissolveDirection.value = directionValue;
      }
    }

    mat.uniform.uProgress.value = progress ?? 0;
    mat.uniform.uUseMeshTransition.value = useMeshTrantision ?? true;
  }
};

function generateCubeUVSize(imageHeight: number) {
  const maxMip = Math.log2(imageHeight) - 2;

  const texelHeight = 1.0 / imageHeight;

  const texelWidth = 1.0 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16));

  return { texelWidth, texelHeight, maxMip };
}
type ProbeParam = {
  defines: Partial<MaterialDefines>;
  uniforms: MATERIAL_SHADER['PROBE']['uniforms'];
  vUserData: VUserData;
};
const probeCache = new WeakMap<applyProbeReflectionProbe, ProbeParam>();

function getProbeParams(
  this: THREE.Material,
  params: applyProbeReflectionProbe,
): ProbeParam {
  if (probeCache.has(params)) {
    return probeCache.get(params)!;
  }

  const retval: ProbeParam = {
    defines: {},
    // @ts-ignore
    uniforms: {},
    vUserData: {},
  };

  const {
    probes,
    texture: pmremTexture,
    resolution: pmremResolution,
    walls,
    probeContrast,
    probeIntensity,
  } = params;

  // basic info setup
  const targetProbeIds = probes.map(p => p.getId());
  const targetProbeNames = probes.map(p => p.getName());

  retval.vUserData = {
    probeType: 'multi',
    probeIds: targetProbeIds,
    probeNames: targetProbeNames,
  };

  const useWall = typeof walls?.length === 'number' && walls.length > 0;

  // const pmremImage = pmremTexture.image;
  // debugger;
  const { texelWidth, texelHeight, maxMip } = generateCubeUVSize(
    pmremTexture.image.height,
  );

  retval.defines = {
    PROBE_COUNT: probes.length,
    PROBE_COLS: `${getProbeSize(probes.length).cols}.0`,
    PROBE_ROWS: `${getProbeSize(probes.length).rows}.0`,
    PROBE_RESOLUTION: `${pmremResolution}.0`,
    V_CUBE_UV_MAX_MIP: `${maxMip}.0`,
    V_CUBE_UV_TEXEL_WIDTH: texelWidth,
    V_CUBE_UV_TEXEL_HEIGHT: texelHeight,
  };

  const metaUniform = probes.map(p => ({
    center: p.getBox().getCenter(new THREE.Vector3()),
    size: p.getBox().getSize(new THREE.Vector3()),
  }));

  retval.uniforms = {
    uProbe: {
      value: metaUniform,
    },
    uProbeTexture: {
      value: pmremTexture,
    },
    uProbeIntensity: this.uniform?.uProbeIntensity
      ? this.uniform.uProbeIntensity
      : { value: probeIntensity ?? 1.0 },

    uProbeContrast: this.uniform?.uProbeContrast
      ? this.uniform.uProbeContrast
      : {
          value: probeContrast ?? 1.0,
        },
  };

  if (useWall) {
    retval.defines.WALL_COUNT = walls.length;

    const targetWalls = walls.map(wall => ({
      start: wall.start,
      end: wall.end,
      index: targetProbeIds.indexOf(wall.probeId),
    }));

    retval.uniforms.uWall = {
      value: targetWalls,
    };
    retval.uniforms.uProbeBlendDist = {
      value: 20.0,
    };

    retval.vUserData.probeType = 'multiWall';
  } else {
    this.removeDefine('WALL_COUNT');
    delete (this.uniform as any).uWall;
    delete (this.uniform as any).uProbeBlendDist;
  }

  probeCache.set(params, retval);

  // debugger;

  return retval;
}

function _applyProbeReflectionProbe(
  this: THREE.Material,
  params: applyProbeReflectionProbe,
) {
  if (params.probes.length === 0) {
    console.warn('applyProbe : probes 없음', this.name, this);
    return;
  }

  const { defines, uniforms, vUserData } = getProbeParams.call(this, params);

  this.addDefines(defines);

  // shader.uniforms에 적용
  for (const _key in uniforms) {
    const key = _key as MATERIAL_UNIFORM;
    const value = (uniforms as any)[key].value;
    this.upsertUniform(key, value);
    // console.log(`this.uniform[${key}].value = ${uniform.value};`)
  }

  this.vUserData = {
    ...this.vUserData,
    ...vUserData,
  };
}

THREE.Material.prototype.applyProbe = function (
  params: applyProbeReflectionProbe,
) {
  _applyProbeReflectionProbe.call(this, params as applyProbeReflectionProbe);
};

THREE.Material.prototype.apply = function <T extends keyof MaterialApplyType>(
  key: T,
  params: MaterialApplyType[T],
) {
  if (!this.uniform) {
    this.uniform = defaultUniforms;
  }
  switch (key) {
    case 'meshTransition':
      this.prepareMeshTransition(params as MaterialApplyType['meshTransition']);
      break;
    case 'lightmapTransition':
      const p = params as MaterialApplyType['lightmapTransition'];
      this.upsertUniform('uUseLightMapTransition', true);
      this.upsertUniform('uProgress', p.progress ?? 0);
      this.upsertUniform('uLightMapTo', p.target);

      break;
    case 'probe':
      this.applyProbe(params as any);
      break;
    case 'lightmapContrast':
      if (this.uniform.uLightMapContrast) {
        this.uniform.uLightMapContrast.value = params as number;
      }
      break;
    case 'progress':
      if (this.uniform.uProgress) {
        this.uniform.uProgress.value = params as number;
      }
      break;
    case 'highlightBurn':
      const ph = params as MaterialApplyType['highlightBurn'];
      this.upsertUniform('uUseHighlightBurn', ph.uUseHighlightBurn);
      this.upsertUniform('highlightBurnFactor', ph.highlightBurnFactor);
      break;
    case 'brightnessContrast':
      const bl = params as MaterialApplyType['brightnessContrast'];
      this.upsertUniform('uUseBrightnessValue', bl.uUseBrightnessValue);
      this.upsertUniform('uBrightnessValue', bl.uBrightnessValue);
      this.upsertUniform('uContrastValue', bl.uContrastValue);
      break;
    case 'whiteBalance':
      const wb = params as MaterialApplyType['whiteBalance'];
      this.upsertUniform('uUseWhiteBalance', wb.uUseWhiteBalance);
      this.upsertUniform('uWhiteBalance', wb.uWhiteBalance);
      break;
    case 'saturation':
      const sa = params as MaterialApplyType['saturation'];
      this.upsertUniform('uUseSaturation', sa.uUseSaturation);
      this.upsertUniform('uSaturation', sa.uSaturation);
  }
};

THREE.Material.prototype.remove = function <T extends keyof MaterialApplyType>(
  key: T,
) {
  switch (key) {
    case 'meshTransition':
      this.upsertUniform('uUseMeshTransition', false);

      break;
    case 'lightmapTransition':
      this.upsertUniform('uUseLightMapTransition', false);
      this.upsertUniform('uLightMapTo', EMPTY_TEXTURE.clone());

      break;
    case 'probe':
      this.removeDefine('PROBE_COUNT');
      this.removeDefine('WALL_COUNT');
      this.removeDefine('PROBE_VERSION');
      this.removeDefine('PROBE_COLS');
      this.removeDefine('PROBE_ROWS');
      this.removeDefine('PROBE_RESOLUTION');
      this.removeDefine('V_CUBE_UV_MAX_MIP');
      this.removeDefine('V_CUBE_UV_TEXEL_WIDTH');
      this.removeDefine('V_CUBE_UV_TEXEL_HEIGHT');
      this.removeUniform(
        'uProbe',
        'uProbeTexture',
        'uProbeIntensity',
        'uProbeContrast',
        'uWall',
        'uProbeBlendDist',
      );
      break;
    case 'lightmapContrast':
      if (this.uniform.uLightMapContrast) {
        this.uniform.uLightMapContrast.value = 1.0;
      }
      break;
  }
  this.needsUpdate = true;
  return this;
};
