import * as THREE from 'three';
import { threes } from '../atomUtils';
import { patchFragment } from '../shaders/v_env_frag.glsl';
import { patchVertex } from '../shaders/v_env_vertex.glsl';
import { computeBoundingBoxForMaterial } from '../utils';
import { DEFAULT_MATERIAL_SHADER, defaultUniforms, MATERIAL_DEFINE, MATERIAL_SHADER, MATERIAL_SHADER_TYPE, MATERIAL_UNIFORM, MATERIAL_UNIFORM_VALUE, VUserData } from './VTHREETypes';

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

    updateMultiProbeTexture?(): void;

    // getter, 셰이더를 사용하는 경우 할당되는 유니폼
    //! uniforms를 쓰는 재질이 있으므로 중복 방지를 위해 단수형
    uniform: { [uniform in MATERIAL_UNIFORM]: { value: MATERIAL_UNIFORM_VALUE<uniform> } };

    // defines?: MaterialDefines;
    setDefines(defines: Partial<MaterialDefines>): this;
    addDefines(defines: Partial<MaterialDefines>): this;
    setDefine(key: MATERIAL_DEFINE, value?: any): this;
    removeDefine(key: MATERIAL_DEFINE): this;

    fromThree(material: THREE.Material): this;

    updateVersion(): this;

    // 셰이더를 사용하고 있는지
    using<T extends MATERIAL_SHADER_TYPE>(type: T): boolean;

    on<T extends MATERIAL_SHADER_TYPE>(type: T, params?: Partial<MATERIAL_SHADER[T]>): this;

    off<T extends MATERIAL_SHADER_TYPE>(type: T): this;

    // off->on으로 갈 때 params 사용
    toggle<T extends MATERIAL_SHADER_TYPE>(type: T, params?: Partial<MATERIAL_SHADER[T]>): this;
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
      if (this.uniform?.progress?.value !== undefined) {
        return this.uniform.progress.value;
      } else {
        console.warn("머티리얼 유니폼/프로그레스 없음 : ", this.name)
        return 0;
      }
    },
    set(value: number) {
      if (typeof this.uniform?.progress !== undefined) {
        this.uniform.progress.value = value;
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
      return this.uniform.MESH_TRANSITION.value;
    },
    set(value: boolean) {
      this.uniform.MESH_TRANSITION.value = value;
    },
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'LIGHTMAP_TRANSITION')) {
  Object.defineProperty(THREE.Material.prototype, 'LIGHTMAP_TRANSITION', {
    get() {
      return this.uniform.LIGHTMAP_TRANSITION.value;
    },
    set(value: boolean) {
      this.uniform.LIGHTMAP_TRANSITION.value = value;
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

THREE.Material.prototype.updateVersion = function () {

  const targetVersion = (versionMap.get(this) ?? 0) + 1;

  versionMap.set(this, targetVersion);

  this.addDefines({
    MATERIAL_VERSION: targetVersion
  })

  return this;
}

// THREE.Material.prototype._progress = { value: 0 };

THREE.Material.prototype.on = function <T extends MATERIAL_SHADER_TYPE>(type: T, params?: Partial<MATERIAL_SHADER[T]>) {

  // if (this.using(type)) {
  // console.warn("Already using", type, ", Material name : ", this.name, this);
  //   return this;
  // }

  const filledParams: MATERIAL_SHADER[T] = {
    ...DEFAULT_MATERIAL_SHADER[type],
    ...params,
  };

  this.defines = {
    ...this.defines,
    ...filledParams.defines,
  };

  // this.shader.uniforms = {
  //   ...this.shader.uniforms,
  //   ...filledParams.uniforms,
  // };

  const prevUniforms: Record<string, any> = this.uniform ?? {};
  const patchUniforms = (shaderUniforms: any, uniforms: any) => {
    for (const key in uniforms) {
      upsert(shaderUniforms, key, uniforms[key].value);
    }

    // 이전 유니폼 중 없는 유니폼만 이어서 추가
    for (const key in prevUniforms) {
      if (key in shaderUniforms) {
        continue;
      }
      shaderUniforms[key] = prevUniforms[key];
    }
  }

  const matname = this.name;
  this.onBeforeCompile = (shader, renderer) => {
    console.log("onBeforeCompile:", matname);
    patchVertex(shader);
    patchFragment(shader);
    patchUniforms(shader.uniforms, filledParams.uniforms);

    console.log("Onbeforecompile uniforms : ", matname, shader.uniforms,);
  }

  return this;
}

THREE.Material.prototype.onBeforeCompile = function (shader: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) {

  patchVertex(shader);
  patchFragment(shader);

  // 첫 컴파일 시 default 유니폼 할당
  for (const key in defaultUniforms) {
    upsert(shader.uniforms, key, (defaultUniforms as any)[key].value);
  }

  // 첫 컴파일 시 this.uniform 호출 가능
  this.uniform = shader.uniforms as any;
}

THREE.Material.prototype.off = function <T extends MATERIAL_SHADER_TYPE>(type: T) {

  if (!this.using(type)) {
    // console.warn("Not using", type, ", Cannot turn off.  Material name : ", this.name, this);
    return this;
  }

  const {
    defines,
    uniforms
  } = DEFAULT_MATERIAL_SHADER[type];

  // handle defines
  const defineKeys = Object.keys(defines) as string[];

  const defineCopied = { ...this.defines };

  for (const key of defineKeys) {
    delete defineCopied[key];
  }
  this.defines = defineCopied;


  // handle uniforms
  // const uniformKeys = Object.keys(uniforms) as string[];
  // const uniformCopied = { ...this.shader.uniforms };
  // for (const key of uniformKeys) {
  //   delete uniformCopied[key];
  // }
  // this.shader.uniforms = uniformCopied;

  return this;
}

THREE.Material.prototype.using = function <T extends MATERIAL_SHADER_TYPE>(type: T) {
  const {
    defines,
    // uniforms
  } = DEFAULT_MATERIAL_SHADER[type];

  const defineKeys = Object.keys(defines) as string[];
  // const uniformKeys = Object.keys(uniforms) as string[];

  const toCheck = this.defines ?? {};
  const keys = Object.keys(toCheck);

  // 이미 재질의 defines에 정의된 키들이 모두 있는지 확인
  for (const key of defineKeys) {
    if (!keys.includes(key)) {
      return false;
    }
  }

  // for (const key of uniformKeys) {
  //   if (!(this.shader.uniforms ?? {})[key]) {
  //     return false;
  //   }
  // }

  return true;
};

THREE.Material.prototype.toggle = function <T extends MATERIAL_SHADER_TYPE>(type: T, params?: Partial<MATERIAL_SHADER[T]>) {

  if (this.using(type)) {
    return this.off(type);
  } else {
    return this.on<T>(type, params);
  }
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


THREE.Material.prototype.fromThree = function (material: THREE.Material) {
  return material;
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
    if (!mat.uniform.dissolveOrigin) {
      mat.uniform.dissolveOrigin = { value: this.vUserData.dissolveOrigin };
    } else {
      mat.uniform.dissolveOrigin.value.copy(this.vUserData.dissolveOrigin);
    }

    if (!mat.uniform.dissolveMaxDist) {
      mat.uniform.dissolveMaxDist = { value: this.vUserData.dissolveMaxDist };
    } else {
      mat.uniform.dissolveMaxDist.value = this.vUserData.dissolveMaxDist;
    }

    const directionValue = direction === "fadeIn" ? true : false;
    if (!mat.uniform.dissolveDirection) {
      mat.uniform.dissolveDirection = { value: directionValue };
    } else {
      if (typeof direction !== 'undefined') {
        mat.uniform.dissolveDirection.value = directionValue;
      }
    }

    mat.uniform.progress.value = progress ?? 0;
    mat.uniform.MESH_TRANSITION.value = useMeshTrantision ?? true;
  }

}
