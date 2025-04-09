import { THREE } from 'VTHREE';

type VScene = {
  traverse: (callback: (object: any) => void) => void;
  referenceScene?: VScene;
};

const RenderableScene = {
  from(scene: VScene) {
    return this;
  },
};

type AB = A | B;

class A {}
class B {}

function make<T extends AB>(): T {
  return new A(); // ❌ Type 'A' is not assignable to type 'T'
}

type Asset = THREE.Mesh | THREE.Material | THREE.Texture;

type RemoteAsset = {
  type: 'mesh' | 'material' | 'texture' | 'probe';
  id: string;
  url: string;
  data: any;
};

// 처음에 주어지는 메타데이터
const RemoteAssetList = new Map<string, RemoteAsset>();

const AssetManager = {
  async _loadRemote<T extends Asset>(id: any): Promise<T> {
    const asset = RemoteAssetList.get(id);

    if (!asset) {
      throw new Error(`Asset with id ${id} not found`);
    }

    return fetch(asset.url)
      .then(res => res.arrayBuffer())
      .then(data => {
        switch (asset.type) {
          case 'mesh':
            return new THREE.Mesh() as T;
          case 'material':
            return new THREE.Material() as T;
          case 'texture':
            return new THREE.Texture() as T;
          case 'probe':
            return new THREE.Texture() as T;
          default:
            throw new Error(`Unknown asset type ${asset.type}`);
        }
      });
  },

  async load<T extends Asset>(id: string) {
    return this.meshes.get(id) ?? this._loadRemote<T>(id);
  },

  async loadScene(scene: VScene) {
    const assets: Promise<any>[] = [];
    scene.traverse(o => {
      // o는 mesh, material, texture, probe 등
      assets.push(this.load(o));
    });

    return Promise.all(assets);
  },
  meshes: new Map(),
  materials: new Map(),
};

const OptionManager = {
  init(p?: any) {},
  loadCurrentScene() {
    const currentScene = this._buildSceneTree();
    this.currentScene = currentScene;

    const scene = this.currentScene;
    scene;
  },
  changeOption(id: string, value: any) {
    return this;
  },
  _buildSceneTree() {
    function build(targetScene: VScene) {
      // 레퍼런스씬과 현재 옵션들을 고려하여 씬을 빌드
      targetScene.referenceScene;

      return {} as VScene;
    }

    const currentScene = build(this.currentScene);

    return currentScene;
  },
  currentScene: {
    referenceScene: {} as VScene,
  } as VScene,
  referenceScenes: [] as VScene[],
};

// 사용
const initialMetaData = {};
OptionManager.init(initialMetaData);

// 첫 씬 로드
let scene = OptionManager.loadCurrentScene();
const renderer = {} as any;
const camera = {} as any;
renderer.render(scene, camera);

// 옵션 변경
scene = OptionManager.changeOption('dp', 'on')
  .changeOption('library', 'off')
  .loadCurrentScene();
renderer.render(scene, camera);
