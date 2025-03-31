import * as THREE from 'three';
import { threes } from '../atomUtils';
import type ReflectionProbe from '../ReflectionProbe';
import { patchFragment } from '../shaders/v_env_frag.glsl';
import { patchVertex } from '../shaders/v_env_vertex.glsl';
import { computeBoundingBoxForMaterial } from '../utils';
import { DEFAULT_MATERIAL_SHADER, defaultUniforms, EMPTY_TEXTURE, MATERIAL_DEFINE, MATERIAL_SHADER, MATERIAL_UNIFORM, MATERIAL_UNIFORM_VALUE, VUserData } from './VTHREETypes';

// 재질 : uniform
// { material1 : { lightmapContrast : { value : 1.0 } } }
// const uniformMap = new WeakMap<THREE.Material, Record<string, Record<FlushValues, any>>>();

const versionMap = new WeakMap<THREE.Material, number>();

export type MaterialDefines = { [key in MATERIAL_DEFINE]?: any };



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

    get MESH_TRANSITION(): boolean;
    set MESH_TRANSITION(value: boolean);
    get LIGHTMAP_TRANSITION(): boolean;
    set LIGHTMAP_TRANSITION(value: boolean);

    // mat을 쓰는 모든 메시의 바운딩박스와 dissolve 관련 유니폼 준비
    // fadeOut = fale
    // fadeIn = true
    prepareMeshTransition(params: {
      direction: "fadeIn" | "fadeOut",
      progress?: number, // default : 0
      useMeshTrantision?: boolean, // default : true, 유니폼의 MESH_TRANSITION을 설정할것인가
      scene?: THREE.Scene, // undefined면 threeExports 사용
    }): void;

    prepareProbe(params: {
      probeCount: number;
      wallCount?: number;
    }): void;

    applyProbe(params: {
      probes: ReflectionProbe[];
      walls?: {
        start: THREE.Vector3;
        end: THREE.Vector3;
        probeId: string;
      }[];
    }): void;

    updateMultiProbeTexture?(): void;

    // getter, 셰이더를 사용하는 경우 할당되는 유니폼
    //! uniforms를 쓰는 재질이 있으므로 중복 방지를 위해 단수형
    uniform: { [uniform in MATERIAL_UNIFORM]: { value: MATERIAL_UNIFORM_VALUE<uniform> } };

    // defines?: MaterialDefines;
    setDefines(defines: Partial<MaterialDefines>): this;
    addDefines(defines: Partial<MaterialDefines>): this;
    setDefine(key: MATERIAL_DEFINE, value?: any): this;
    removeDefine(key: MATERIAL_DEFINE): this;

  }


}

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'basic')) {
  Object.defineProperty(THREE.Material.prototype, 'basic', {
    get() {
      return this as THREE.MeshBasicMaterial;
    },
    set() {
      throw new Error('basic is read-only');
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'standard')) {
  Object.defineProperty(THREE.Material.prototype, 'standard', {
    get() {
      return this as THREE.MeshStandardMaterial;
    },
    set() {
      throw new Error('standard is read-only');
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'physical')) {
  Object.defineProperty(THREE.Material.prototype, 'physical', {
    get() {
      return this as THREE.MeshPhysicalMaterial;
    },
    set() {
      throw new Error('physical is read-only');
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'progress')) {
  Object.defineProperty(THREE.Material.prototype, 'progress', {
    get() {
      if (this.uniform?.uProgress?.value !== undefined) {
        return this.uniform.uProgress.value;
      } else {
        console.warn("머티리얼 유니폼/프로그레스 없음 : ", this.name)
        return 0;
      }
    },
    set(value: number) {
      if (typeof this.uniform?.uProgress !== undefined) {
        this.uniform.uProgress.value = value;
      } else {
        console.warn("머티리얼 유니폼/프로그레스 없음 : ", this.name)
      }
    },
  });
}

THREE.Material.prototype.uniform = (() => {
  DEFAULT_MATERIAL_SHADER
})() as any;

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'MESH_TRANSITION')) {
  Object.defineProperty(THREE.Material.prototype, 'MESH_TRANSITION', {
    get() {
      return this.uniform.uUseMeshTransition.value;
    },
    set(value: boolean) {
      this.uniform.uUseMeshTransition.value = value;
    },
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'LIGHTMAP_TRANSITION')) {
  Object.defineProperty(THREE.Material.prototype, 'LIGHTMAP_TRANSITION', {
    get() {
      return this.uniform.uUseLightMapTransition.value;
    },
    set(value: boolean) {
      this.uniform.uUseLightMapTransition.value = value;
    },
  });
}

// 유니폼 업서트
const upsert = (uniform: any, key: string, value: any) => {
  try {
    uniform[key].value = value;
  } catch {
    uniform[key] = { value };
  }
}

THREE.Material.prototype.onBeforeCompile = function (shader: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) {

  if (!this.vUserData.isVMaterial) {
    return;
  }

  console.log("onBeforeCompile", this.name, this.type,);

  patchVertex(shader);
  patchFragment(shader);

  // 첫 컴파일 시 default 유니폼 할당
  const possibleUniforms = [...Object.keys(defaultUniforms),
  ] as MATERIAL_UNIFORM[];
  for (const key of possibleUniforms) {

    // console.log(`   (this.uniform as any)?.[${key}]?.value : `, (this.uniform as any)?.[key]?.value);

    // 밖에서 넣어준 uniform을 재할당
    const value = (this.uniform as any)?.[key]?.value ?? (defaultUniforms as any)[key]?.value;

    if (typeof value !== "undefined") {
      // console.log("   onBeforeCompile", key, value);
      upsert(shader.uniforms, key, value);
    }

  }

  // initProbeOnBeforeCompile.call(this, shader);

  // 컴파일 시 this.uniform 호출 가능
  this.uniform = shader.uniforms as any;
}

THREE.Material.prototype.setDefines = function (defines: Partial<MaterialDefines>) {
  this.defines = defines;
  return this;
};

THREE.Material.prototype.addDefines = function (defines: Partial<MaterialDefines>) {
  this.defines = { ...this.defines, ...defines };
  return this;
};

THREE.Material.prototype.setDefine = function (key: MATERIAL_DEFINE, value: any = "") {
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
  direction: "fadeIn" | "fadeOut",
  progress?: number, // default : 0
  useMeshTrantision?: boolean, // default : true
  scene?: THREE.Scene,
}) {
  const { scene, direction, progress, useMeshTrantision } = params;

  if (
    typeof this.vUserData.dissolveOrigin === "undefined" ||
    typeof this.vUserData.dissolveMaxDist === "undefined"
  ) {
    const targetScene = scene ?? threes()?.scene;
    if (!targetScene) {
      console.warn("prepareMeshTransition : scene 없음", this.name, this);
      return;
    }

    const box = computeBoundingBoxForMaterial(targetScene, this)!;

    if (!box) {
      console.warn("prepareMeshTransition : bounding box 없음", this.name, this);
      return;
    }


    // dissolveOrigin 설정: x는 minX, y는 중앙, z는 minZ
    const minX = box.min.x; // 왼쪽 X 좌표
    const centerY = (box.min.y + box.max.y) / 2; // Y 중앙
    const minZ = box.min.z; // 가장 앞쪽 (액자의 왼쪽 테두리)

    // dissolveOrigin을 Three.js Vector3로 설정
    const dissolveOrigin = new THREE.Vector3(minX, centerY, minZ);

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

    const directionValue = direction === "fadeIn" ? true : false;
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

}

function generateCubeUVSize(imageHeight: number) {

  const maxMip = Math.log2(imageHeight) - 2;

  const texelHeight = 1.0 / imageHeight;

  const texelWidth = 1.0 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16));

  return { texelWidth, texelHeight, maxMip };

}

THREE.Material.prototype.prepareProbe = function (params: {
  probeCount: number;
  wallCount?: number;
}) {
  const { probeCount, wallCount } = params;
  this.addDefines({
    PROBE_COUNT: probeCount,
    USE_PROBE_PMREM: true,
  })

  const probe = [];
  const textures = [];
  for (let i = 0; i < probeCount; i++) {
    probe.push({
      center: new THREE.Vector3(),
      size: new THREE.Vector3(),
    });
    textures.push(EMPTY_TEXTURE.clone());
  }

  const uniform: Partial<MATERIAL_SHADER["PROBE"]["uniforms"]> = {
    uProbe: { value: probe },
    uProbeTextures: { value: textures },
    uProbeIntensity: { value: 1.0 },
    uProbeContrast: { value: 1.0 },
    uCubeUVMaxMip: { value: 0.0 },
    uCubeUVTexelWidth: { value: 0.0 },
    uCubeUVTexelHeight: { value: 0.0 },
  }

  if (wallCount) {
    this.addDefines({
      WALL_COUNT: wallCount,
    })

    const walls = [];
    for (let i = 0; i < wallCount; i++) {
      walls.push({
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
        index: -1,
      })
    }
    uniform.uWall = { value: walls };
    uniform.uProbeBlendDist = { value: 20.0 };
  } else {
    this.removeDefine("WALL_COUNT");
    delete (this.uniform as any).uWall;
    delete (this.uniform as any).uProbeBlendDist;
  }

  for (const _key in uniform) {
    const key = _key as MATERIAL_UNIFORM;
    const value = (uniform as any)[key];
    this.uniform = this.uniform ?? {};
    if (this.uniform[key]) {
      this.uniform[key].value = value.value;
    } else {
      this.uniform[key] = value;
    }
  }
}

THREE.Material.prototype.applyProbe = function (params: {
  probes: ReflectionProbe[];
  walls?: {
    start: THREE.Vector3;
    end: THREE.Vector3;
    probeId: string;
  }[];
}) {
  const { probes, walls } = params;
  if (probes.length === 0) {
    console.warn("applyProbe : probes 없음", this.name, this);
    return;
  }

  if (walls && walls.length === 0) {
    console.warn("applyProbe : walls 없음", this.name, this);
  }
  const useWall = walls && walls.length > 0;

  const usePmrem = true;

  this.addDefines({
    PROBE_COUNT: probes.length,
  })
  if (usePmrem) {
    this.addDefines({
      USE_PROBE_PMREM: true,
    })
  }

  const metaUniform = probes.map((p) => ({
    center: p.getBox().getCenter(new THREE.Vector3()),
    size: p.getBox().getSize(new THREE.Vector3()),
  }))

  const getTextures = () => probes.map(p => usePmrem ? p.getTexture() : p.getRenderTargetTexture());
  // const textures = getTextures();


  let pmremUniforms = {};

  if (usePmrem) {
    const pmremParams = generateCubeUVSize(probes[0]?.getResolution());
    const { texelWidth, texelHeight, maxMip } = pmremParams;;

    pmremUniforms = {
      uCubeUVMaxMip: { value: maxMip },
      uCubeUVTexelWidth: { value: texelWidth },
      uCubeUVTexelHeight: { value: texelHeight },
    }
  }

  const uniforms: Partial<MATERIAL_SHADER["PROBE"]["uniforms"]> = {

    // uProbeType: { value: PROBE_TYPE },
    // uProbeCount: {
    //   value: probes.length
    // },
    uProbe: {
      value: metaUniform
    },
    uProbeTextures: {
      value: getTextures()
    },
    uProbeIntensity: {
      value: 1.0
    },
    uProbeContrast: {
      value: 1.0
    },

    ...pmremUniforms,

  };

  if (useWall) {
    this.addDefines({
      WALL_COUNT: walls.length,
    })
    const targetProbeIds = probes.map(p => p.getId());
    const targetWalls = walls.map((wall) => ({
      start: wall.start,
      end: wall.end,
      index: targetProbeIds.indexOf(wall.probeId)
    }));

    uniforms.uWall = {
      value: targetWalls
    };
    uniforms.uProbeBlendDist = {
      value: 20.0
    };
  } else {
    this.removeDefine("WALL_COUNT");
    delete (this.uniform as any).uWall;
    delete (this.uniform as any).uProbeBlendDist;
  }

  // shader.uniforms에 적용
  for (const _key in uniforms) {
    const key = _key as MATERIAL_UNIFORM;
    const uniform = (uniforms as any)[key];
    if (this.uniform[key]) {
      this.uniform[key].value = uniform.value;
    } else {
      this.uniform[key] = uniform;
    }
    // console.log(`this.uniform[${key}].value = ${uniform.value};`)
  }
  // console.log(this.uniform);
  // console.log(this.defines);
}
