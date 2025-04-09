import { v4 } from 'uuid';
import { THREE } from 'VTHREE';

type OptionActionBase = {
  type: OptionActionType;
};

// method를 제외한 모든 field
type ThreeMaterialKeys = {
  [K in keyof THREE.MeshPhysicalMaterial]: THREE.MeshPhysicalMaterial[K] extends Function
    ? never
    : K;
}[keyof THREE.MeshPhysicalMaterial];
type MaterialChangeKeys =
  | Exclude<ThreeMaterialKeys, undefined>
  | 'probeIds'
  | 'probeType';

type ActionMaterialChange = OptionActionBase & {
  matId: string;
  material: Record<MaterialChangeKeys, any>;
};
type ActionMeshHide = OptionActionBase & {
  meshId: string;
  hide: boolean;
};
type ActionMeshShow = OptionActionBase & {
  meshId: string;
  show: boolean;
};

const DefaultOptionActions = {
  materialChange: [
    {
      material: {},
    },
  ] as ActionMaterialChange[],
  meshHide: [] as ActionMeshHide[],
  meshShow: [] as ActionMeshShow[],
} as const;
type OptionActions = typeof DefaultOptionActions;
type OptionActionType = keyof OptionActions;

type OptionItem = {
  name: string;
  id: string;
  selected: boolean;
  action: OptionActions;
  workingScene: VScene;
  savedScene: VScene;
};

type OptionProperty = {
  name: string;
  id: string;
  index: number;
  select: OptionItem[];
};

export const createDefaultOptionItem = (params?: Partial<OptionItem>) => {
  const retval: OptionItem = {
    name: '옵션',
    id: v4(),
    selected: false,
    action: {
      materialChange: [],
      meshHide: [],
      meshShow: [],
    },
    ...params,
  };
  return retval;
};

export const createDefaultOptionProperty = (index: number) => {
  const retval: OptionProperty = {
    name: '이름없음',
    id: v4(),
    index,
    select: [
      createDefaultOptionItem({
        selected: true,
      }),
    ],
  };
  return retval;
};

// three.js scene을 받아서 분석 가능한 형태의 scene으로 변환
class VScene {
  vsceneId: string;
  scenePtr!: THREE.Scene;
  meshes!: Set<THREE.Mesh>;
  materials!: Set<THREE.Material>;

  constructor(scene?: THREE.Scene) {
    this.setScene(scene);
    this.vsceneId = v4();
  }

  setScene(scene?: THREE.Scene) {
    if (!scene) {
      return;
    }
    this.scenePtr = scene;

    type Events = Parameters<THREE.Scene['addEventListener']>[0];

    // flatten mesh / material
    this.parse(scene);
  }

  // 인풋 씬으로부터 스스로를 업데이트
  parse(scene: THREE.Scene) {
    const meshes: Set<THREE.Mesh> = new Set();
    const materials: Set<THREE.Material> = new Set();
    scene.traverse(node => {
      if (node instanceof THREE.Mesh) {
        meshes.add(node);
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach((material: THREE.Material) =>
              materials.add(material),
            );
          } else {
            materials.add(node.material);
          }
        }
      }
    });
  }
}

export default class OptionManager {
  optionMap = new Map<string, OptionProperty>();
  scenes: VScene[];
  callbacks = new Map<OptionActionType, Function>();

  constructor() {
    this.scenes = [];
  }

  on<T extends OptionActionType>(action: T, cb: Function) {
    this.callbacks.set(action, cb);
  }

  addScene(scene: THREE.Scene) {
    const vscene = new VScene(scene);
    this.scenes.push(vscene);
  }

  reorderIndex() {
    const keys = Array.from(this.optionMap.keys());
    keys.forEach((key, index) => {
      const prop = this.optionMap.get(key);
      if (prop) {
        prop.index = index;
        this.optionMap.set(key, prop);
      }
    });
  }

  add(params?: Partial<OptionProperty>) {
    const latestIndex = this.optionMap.size;

    const defaultParams = createDefaultOptionProperty(latestIndex);

    const prop = {
      ...defaultParams,
      ...params,
    };

    this.optionMap.set(prop.id, prop);
  }

  getProperty(id: string | { id: string }) {
    const _id = typeof id === 'string' ? id : id.id;

    if (!this.optionMap.has(_id)) {
      throw new Error('OptionProperty not found');
    }

    return this.optionMap.get(_id)!;
  }

  getItem(id: string | { id: string }): OptionItem {
    const _id = typeof id === 'string' ? id : id.id;
    // iterate the whole map
    for (const prop of this.optionMap.values()) {
      const item = prop.select.find(item => item.id === _id);
      if (item) {
        return item;
      }
    }

    throw new Error('OptionItem not found');
  }

  activateItem(id: string | { id: string }) {
    const _id = typeof id === 'string' ? id : id.id;
    let targetProp: OptionProperty | undefined;
    let targetItem: OptionItem | undefined;
    for (const prop of this.optionMap.values()) {
      const item = prop.select.find(item => item.id === _id);
      if (item) {
        targetItem = item;
        targetProp = prop;
        break;
      }
    }

    if (!targetProp || !targetItem) {
      throw new Error('OptionItem not found');
    }

    targetProp.select.forEach(item => {
      item.selected = item.id === targetItem.id;
    });

    !TODO : 아이템이 활성화되면 어떻게 처리할 지 고민
  }
}
