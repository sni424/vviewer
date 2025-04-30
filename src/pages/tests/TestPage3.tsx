import { ClassValue } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { __UNDEFINED__ } from 'src/Constants';
import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import { getTypedArray } from 'src/scripts/manager/assets/AssetUtils';
import Workers from 'src/scripts/manager/assets/Workers';
import { cn } from 'src/scripts/utils';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { THREE } from 'VTHREE';
import useTestModelDragAndDrop from './useTestModelDragAndDrop';

type VEvents = {
  loadStart: (value: CacheValue) => void;
  loadFinish: (value: CacheValue) => void;
  loadedAll: () => void;
};
type VEvent = keyof VEvents;

function Panel() {
  const meshesRef = useRef(new Map<string, CacheValue>());
  const texturesRef = useRef(new Map<string, CacheValue>());
  const [selectTarget, setSelectTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [__, ___] = useState(0);
  const rerender = () => ___(_ => _ + 1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 선택 해제
      if (e.key === 'Escape') {
        setSelected([]);
        setSelectTarget(null);
      }

      // 전체선택
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        const uuids = meshes.map(m => m.uuid);

        setSelected(uuids);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const onLoadStart = (value: CacheValue) => {
      meshesRef.current.set(value.file.name, value);
    };

    const onLoadFinish = (value: CacheValue) => {
      console.log('finish', value);
    };

    const onLoadedAll = () => {
      console.log('all loaded');
      console.log(AssetMgr.objects);
    };

    AssetMgr.on('loadStart', onLoadStart);
    AssetMgr.on('loadFinish', onLoadFinish);
    AssetMgr.on('loadedAll', onLoadedAll);

    return () => {
      AssetMgr.removeEvent('loadStart', onLoadStart);
      AssetMgr.removeEvent('loadFinish', onLoadFinish);
      AssetMgr.removeEvent('loadedAll', onLoadedAll);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(selected));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-[240px] h-full bg-gray-50 overflow-y-auto">
      <h3>Panel</h3>
      <ul className="select-none">
        {meshes.map((mesh, index) => {
          const uuid = mesh.uuid;
          const thisSelectTarget = selectTarget === uuid;
          const thisSelected = selected.includes(uuid);

          const classes: ClassValue[] = [];
          if (thisSelected) {
            classes.push('bg-blue-200');
          }
          if (thisSelectTarget) {
            classes.push('border-2 border-blue-500 border-dashed');
          }

          return (
            <li
              draggable
              onDragStart={handleDragStart}
              key={`mesh-list-${uuid}`}
              className={cn(...classes, 'text-xs')}
              onClick={e => {
                e.preventDefault();

                const start = selectTarget;

                if (!e.shiftKey && !e.ctrlKey) {
                  setSelectTarget(uuid);
                }

                if (e.shiftKey) {
                  if (start) {
                    const startIndex = meshes.findIndex(m => m.uuid === start);
                    const endIndex = meshes.findIndex(m => m.uuid === uuid);

                    const startNum = Math.min(startIndex, endIndex);
                    const endNum = Math.max(startIndex, endIndex);

                    const selectedUuids = meshes
                      .slice(startNum, endNum + 1)
                      .map(m => m.uuid);
                    setSelected(selectedUuids);
                  } else {
                    setSelected([uuid]);
                  }
                } else {
                  if (thisSelected) {
                    if (e.ctrlKey) {
                      setSelected(prev => prev.filter(v => v !== uuid));
                    }
                  } else {
                    if (e.ctrlKey) {
                      setSelected(prev => [...prev, uuid]);
                    } else if (e.shiftKey) {
                    } else {
                      setSelected([uuid]);
                    }
                  }
                }
              }}
            >
              {index + 1}. {mesh.name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

class VTHREE {
  // Field values
  static parent: HTMLDivElement;
  static camera: THREE.PerspectiveCamera;
  static renderer: THREE.WebGLRenderer;
  static controls: OrbitControls;
  static dom: HTMLCanvasElement;

  static _isInited = false;
  static checkInit() {
    if (!this._isInited) throw new Error('VTHREE.init() 필요');
  }

  private static get scene() {
    return ProjectMgr.scene;
  }

  // Options
  static useOrbit: boolean = true;

  static init(parent: HTMLDivElement) {
    if (this._isInited) {
      return;
    }

    this._isInited = true;
    this.parent = parent;

    const { width, height } = VTHREE.canvasSize();

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 1, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.dom = this.renderer.domElement;
    // this.dom.width = width;
    // this.dom.height = height;
    // this.dom.className = 'absolute top-0 left-0 z-0 pointer-events-auto'; // Add Tailwind classes

    this.controls = new OrbitControls(this.camera, this.dom);
    this.controls.enableDamping = true;

    window.addEventListener('resize', () => {
      const { width, height } = VTHREE.canvasSize();
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });

    this.addDomToParent();

    console.log('VTHREE initialized');

    return this;
  }

  static cleanup() {
    this.checkInit();

    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });

    this.renderer.dispose();
    this.parent.removeChild(this.dom);
    this._isInited = false;

    return this;
  }

  static canvasSize() {
    this.checkInit();

    const parent = VTHREE.parent;
    // const rect = parent.getBoundingClientRect();
    // const width = Math.floor(rect.width);
    // const height = Math.floor(rect.height);
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    return { width, height };
  }

  static render() {
    this.checkInit();

    const { camera, renderer, controls, useOrbit } = VTHREE;
    const scene = ProjectMgr.scene;
    // scene.meshes().forEach(mesh => console.log(mesh.name));

    if (useOrbit) {
      controls.update();
    }

    // console.log(scene.id);

    renderer.render(scene, camera);

    return this;
  }

  static addDomToParent() {
    this.checkInit();

    const parent = VTHREE.parent;
    const dom = VTHREE.dom;

    parent.appendChild(dom);

    return this;
  }
}

type Scene = {
  id: string;
  name?: string;
  meshes: string[]; // id[]
};

type CacheValue = {
  file: File;
  buffer: Promise<ArrayBuffer>;
  object?: Promise<VObject[]>;
  texture?: Promise<THREE.Texture>;
};
type VObject = {
  file: File;
  id: string;
  object: THREE.Object3D;
};
type VTexture = {
  file: File;
  id: string;
  texture: THREE.Texture;
};

class AssetMgr {
  static cache = new Map<string, CacheValue>();
  static objects = new Map<string, VObject>();
  static textures = new Map<string, VTexture>();

  static taskId: number = 0;
  static queue = new Set<number>();

  // static onLoadStart?: (value: CacheValue) => void;
  // static onLoadFinish?: (value: CacheValue) => void;
  // static onLoadFinishAll?: () => void;
  static events = new Map<string, Function[]>();

  static on<T extends VEvent>(event: T, callback: VEvents[T]) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }
  static removeEvent<T extends VEvent>(event: T, callback: VEvents[T]) {
    if (!this.events.has(event)) {
      return;
    }
    const callbacks = this.events.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  static getEvent<T extends VEvent>(event: T) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    return this.events.get(event)!;
  }

  static loadedFiles = new Set<File>();

  static addFile(...file: File[]) {
    file = file.filter(f => !this.loadedFiles.has(f));
    file.forEach(f => this.loadedFiles.add(f));

    const getMesh = async (buffer: ArrayBuffer, file: File) => {
      const name = file.name;
      if (!name.endsWith('.glb')) {
        throw new Error('Only glb files are supported');
      }
      const loader = this.loader;
      return loader.parseAsync(buffer, name).then(gltf => {
        const meshes = gltf.scene.flattendMeshes();
        const vobjects: VObject[] = [];
        meshes.forEach(mesh => {
          mesh.vUserData.fileName = name;
          const vobject = {
            file,
            id: mesh.uuid,
            object: mesh,
          };
          this.objects.set(mesh.uuid, vobject);
          vobjects.push(vobject);
        });
        return vobjects;
      });
    };

    const getTexture = async (buffer: ArrayBuffer, file: File) => {
      const name = file.name;

      if (!name.endsWith('.exr')) {
        throw new Error('Only exr files are supported');
      }
      return Workers.exrParse(buffer).then(exr => {
        const texture = new THREE.DataTexture(
          getTypedArray(exr.arrayType, exr.data),
          exr.width,
          exr.height,
          exr.format,
          exr.type,
        );
        texture.needsUpdate = true;

        this.textures.set(texture.uuid, {
          file: file,
          id: texture.uuid,
          texture: texture,
        });

        return texture;
      });
    };

    file.forEach(f => {
      const bufferProm = f.arrayBuffer();
      const meshProm = () => bufferProm.then(buffer => getMesh(buffer, f));
      const textureProm = () =>
        bufferProm.then(buffer => getTexture(buffer, f));

      const cacheValue = {
        file: f,
        buffer: bufferProm,
        object: f.name.endsWith('glb') ? meshProm() : undefined,
        texture: f.name.endsWith('exr') ? textureProm() : undefined,
      };

      this.cache.set(f.name, cacheValue);

      const taskId = ++this.taskId;
      this.queue.add(taskId);
      this.getEvent('loadStart').forEach(callback => {
        callback(cacheValue);
      });
      const proms = [bufferProm, cacheValue.object, cacheValue.texture].filter(
        Boolean,
      );
      console.log('this.queue.size', this.queue.size);
      Promise.all(proms).then(() => {
        // this.onLoadFinish?.(cacheValue);
        this.getEvent('loadFinish').forEach(callback => {
          callback(cacheValue);
        });
        this.queue.delete(taskId);
        if (this.queue.size === 0) {
          this.getEvent('loadedAll').forEach(callback => {
            callback();
          });
        }
      });
    });
  }

  static loader: VGLTFLoader;
  static _isInited = false;
  static init(loader: VGLTFLoader) {
    if (this._isInited) return;
    this._isInited = true;
    this.loader = loader;
  }
}

class ProjectMgr {
  static scenes = new Map<string, Scene>();
  static currentScene: string;

  static _prevSceneId: string = __UNDEFINED__;
  static _prevScene: THREE.Scene | null = null;

  static buildScene(sceneId: string): THREE.Scene {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene with id ${sceneId} not found`);
    }

    const _scene = new THREE.Scene();
    _scene.name = sceneId;

    scene.meshes.forEach(meshId => {
      const mesh = AssetMgr.objects.get(meshId);
      if (mesh) {
        _scene.add(mesh.object);
      }
    });

    return _scene;
  }

  static get scene(): THREE.Scene {
    let _scene: THREE.Scene = this._prevScene!;
    if (this._prevSceneId !== this.currentScene) {
      _scene = this.buildScene(this.currentScene);
      this._prevSceneId = this.currentScene;
      this._prevScene = _scene;
    }

    return _scene;
  }

  private constructor() {}

  static _isInited = false;
  static renderer: VTHREE;

  static init(scene: Scene) {
    if (this._isInited) return;
    this._isInited = true;

    this.scenes.set(scene.id, scene);
    this.currentScene = scene.id;

    // this.renderer = renderer;
  }

  static checkInit() {
    if (!this._isInited) {
      throw new Error('ProjectMgr.init() 필요');
    }
  }

  static addScene(scene: Scene) {
    this.checkInit();

    if (this.scenes.has(scene.id)) {
      console.warn(`Scene with id ${scene.id} already exists. Overwriting.`);
    }
    this.scenes.set(scene.id, scene);
  }
}

function useRenderEveryFrame() {
  const [renderEveryFrame, setRenderEveryFrame] = useState(true);
  useEffect(() => {
    let anim: number = 0;
    function animate() {
      if (VTHREE._isInited) {
        VTHREE.render();
      }
      anim = requestAnimationFrame(animate);
    }
    if (renderEveryFrame) {
      animate();
    } else if (anim) {
      cancelAnimationFrame(anim);
      anim = 0;
    }

    return () => {
      if (anim) {
        cancelAnimationFrame(anim);
      }
    };
  }, [renderEveryFrame]);

  return [renderEveryFrame, setRenderEveryFrame] as [
    typeof renderEveryFrame,
    typeof setRenderEveryFrame,
  ];
}

function TestPage3() {
  const { files, isDragging, handleDragLeave, handleDragOver, handleDrop } =
    useTestModelDragAndDrop();

  const [scene, setScene] = useState<'A' | 'B'>('A');
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const [renderEveryFrame, setRenderEveryFrame] = useRenderEveryFrame();

  const canvasParentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasParentRef.current) return;

    if (VTHREE._isInited) return;

    const parent = canvasParentRef.current;
    VTHREE.init(parent);
    const loader = new VGLTFLoader(VTHREE.renderer);
    AssetMgr.init(loader);
    // VTHREE.setScene('A', new THREE.Scene(), true);
    // VTHREE.setScene('B', new THREE.Scene());
    // VTHREE.scenes.get('A')!.add(new THREE.AmbientLight(0xffffff, 1.0));
    // VTHREE.scenes.get('B')!.add(new THREE.AmbientLight(0xffffff, 1.0));

    ProjectMgr.init({
      id: 'first',
      name: 'First Scene',
      meshes: [],
    });
    ProjectMgr.addScene({
      id: 'second',
      name: 'Second Scene',
      meshes: [],
    });

    return () => {
      VTHREE.cleanup();
    };
  }, []);

  // useEffect(() => {
  //   const handleMeshDrop = (e: DragEvent) => {
  //     console.log('dom drop');
  //     e.preventDefault();
  //     e.stopPropagation();

  //     const data = e.dataTransfer!.getData('text/plain');
  //     const uuids = JSON.parse(data) as string[];

  //     console.log('dragged uuids', uuids, meshes);

  //     meshes
  //       .filter(mesh => uuids.includes(mesh.uuid))
  //       .forEach(mesh => {
  //         console.log('Found : ', mesh.name);
  //         const scene = VTHREE.scene;
  //         scene.add(mesh);
  //       });
  //   };

  //   VTHREE.dom.ondragover = e => {
  //     console.log('dom dragover');
  //     e.preventDefault();
  //   };
  //   VTHREE.dom.ondrop = handleMeshDrop;
  // }, [meshes]);

  useEffect(() => {
    if (files.length === 0) return;

    const onLoadStart = (value: CacheValue) => {
      console.log('start', value);
    };

    const onLoadFinish = (value: CacheValue) => {
      console.log('finish', value);
    };

    const onLoadedAll = () => {
      console.log('all loaded');
      console.log(AssetMgr.objects);
    };

    AssetMgr.on('loadStart', onLoadStart);
    AssetMgr.on('loadFinish', onLoadFinish);
    AssetMgr.on('loadedAll', onLoadedAll);

    AssetMgr.addFile(...files);

    return () => {
      AssetMgr.removeEvent('loadStart', onLoadStart);
      AssetMgr.removeEvent('loadFinish', onLoadFinish);
      AssetMgr.removeEvent('loadedAll', onLoadedAll);
    };
  }, [files]);

  return (
    <div className="w-dvw h-dvh relative" onDragOver={handleDragOver}>
      <div className="w-full h-full flex flex-col">
        <div className="w-full h-10 bg-white flex items-center justify-center">
          <button
            onClick={() => {
              ProjectMgr.currentScene = 'first';
            }}
            disabled={scene === 'A'}
          >
            Scene A [{scene === 'A' ? 'O' : 'X'}]
          </button>
          <button
            onClick={() => {
              ProjectMgr.currentScene = 'first';
            }}
            disabled={scene === 'B'}
          >
            Scene B [{scene === 'B' ? 'O' : 'X'}]
          </button>
          <button
            onClick={() => {
              VTHREE.render();
            }}
          >
            Render
          </button>
          <button
            onClick={() => {
              setRenderEveryFrame(prev => !prev);
            }}
          >
            실시간 렌더 : [{renderEveryFrame ? 'O' : 'X'}]
          </button>
        </div>
        <div className="flex-1 min-h-0 w-full flex">
          <div
            id="canvasContainer"
            className="flex-1 min-h-0 h-full"
            ref={canvasParentRef}
          ></div>
          <Panel></Panel>
        </div>
      </div>

      {isDragging && (
        <div
          className={`absolute left-10 top-10 right-10 bottom-10 bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center text-center text-gray-700 rounded-md`}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          Drop files here
        </div>
      )}
    </div>
  );
}

export default TestPage3;
