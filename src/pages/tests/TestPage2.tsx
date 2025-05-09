import { useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import Asset from 'src/scripts/manager/Asset';
import AssetMgr from 'src/scripts/manager/AssetMgr';
import { isDataArray } from 'src/scripts/manager/assets/AssetTypes';
import { VFile, VRemoteFile } from 'src/scripts/manager/assets/VFile';
import { VScene } from 'src/scripts/manager/assets/VScene';
import { formatNumber } from 'src/scripts/utils';
import { RGBELoader } from 'three/examples/jsm/Addons.js';
import { THREE } from 'VTHREE';
import useTestModelDragAndDrop from './useTestModelDragAndDrop';
import VRenderer from './VRenderer';

const SCENE_ID = 'TEST_SCENE';

const mgr = AssetMgr;
const print = console.log;
interface UploadResponse {
  message: string;
  filePath: string;
  error?: string;
}

const getFilePath = (path: string) => `${AssetMgr.projectId}/${path}`;

// obj를 재귀적으로 돌면서 내부의 ArrayBuffer만 Uint8Array로 변환하는 함수
// ArrayBuffer을 mongodb에 저장하면 데이터가 날아가서 일단 Uint8Array로 변환
function convertArrayBufferToUint8Array(obj: any): any {
  // Handle null or non-object types (return unchanged)
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle ArrayBuffer
  if (obj instanceof ArrayBuffer) {
    return new Uint8Array(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertArrayBufferToUint8Array(item));
  }

  // Handle objects
  const result: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = convertArrayBufferToUint8Array(obj[key]);
    }
  }
  return result;
}

async function upload(
  filepath: string,
  data: object | ArrayBuffer | TypedArray,
  type?: 'json' | 'binary',
): Promise<UploadResponse> {
  filepath = getFilePath(filepath);

  const isArray = data instanceof ArrayBuffer || isTypedArray(data);
  type = type ?? (isArray ? 'binary' : 'json');

  const formData = new FormData();
  let file: File;

  if (type === 'json') {
    // Convert JSON object to a Blob
    const jsonString = JSON.stringify(convertArrayBufferToUint8Array(data));
    file = new File([jsonString], filepath, { type: 'application/json' });
  } else if (isDataArray(data)) {
    // Create a Blob from ArrayBuffer
    if (isTypedArray(data)) {
      file = new File([(data as TypedArray).buffer as ArrayBuffer], filepath, {
        type: 'application/octet-stream',
      });
    } else {
      // ArrayBuffer
      file = new File([data as ArrayBuffer], filepath, {
        type: 'application/octet-stream',
      });
    }
  } else {
    throw new Error('Invalid data type. Expected ArrayBuffer or TypedArray.');
  }

  formData.append('data', file);
  formData.append('filepath', filepath);
  formData.append('type', type);

  return fetch('http://localhost:4000/save', {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'multipart/form-data',
    },
  }).then(res => res.json() as Promise<UploadResponse>);
}

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export type Serializable =
  | null
  | undefined
  | boolean
  | number
  | string
  | ArrayBuffer
  | TypedArray
  | Serializable[]
  | { [key: string]: Serializable };

/**
 * Deeply compares two Serializable values for equality.
 * @param a First value to compare.
 * @param b Second value to compare.
 * @returns True if the values are deeply equal, false otherwise.
 */
function deepEqual(a: Serializable, b: Serializable): boolean {
  // Handle strict equality for primitives and reference equality
  if (a === b) {
    return true;
  }

  // Handle NaN (NaN === NaN is false, but they should be considered equal)
  if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
    return true;
  }

  // Type mismatch or one is null/undefined and the other isn't
  if (typeof a !== typeof b || a == null || b == null) {
    return false;
  }

  // Handle ArrayBuffer
  if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
    if (a.byteLength !== b.byteLength) {
      return false;
    }
    const viewA = new Uint8Array(a);
    const viewB = new Uint8Array(b);
    for (let i = 0; i < a.byteLength; i++) {
      if (viewA[i] !== viewB[i]) {
        return false;
      }
    }
    return true;
  }

  // Handle TypedArray
  if (isTypedArray(a) && isTypedArray(b)) {
    if (a.constructor !== b.constructor || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  // Handle Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Handle Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    return keysA.every(
      key => keysB.includes(key) && deepEqual((a as any)[key], (b as any)[key]),
    );
  }

  // Fallback for primitives that weren't caught by ===
  debugger;
  return false;
}

// Helper to check if a value is a TypedArray
function isTypedArray(value: any): value is TypedArray {
  return (
    value instanceof Int8Array ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Int16Array ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof BigInt64Array ||
    value instanceof BigUint64Array
  );
}

function CallLoader() {
  const { gl } = useThree();
  const ref = useRef(new VGLTFLoader(gl));

  return <></>;
}

function useEffectOnce(effect: () => void | (() => void)) {
  const calledRef = useRef(false);

  useEffect(() => {
    if (!calledRef.current) {
      calledRef.current = true;
      return effect();
    }
  }, []);
}

function TestPage() {
  const [useEnv, setUseEnv] = useState(true);
  const [loadedMat, setLoadedMat] = useState<THREE.Material>();
  // const sceneRef = useRef<THREE.Scene>(new THREE.Scene());

  const [asset, setAsset] = useState<Asset[]>([]);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { files, isDragging, handleDragOver, handleDragLeave, handleDrop } =
    useTestModelDragAndDrop();
  const [loaded, setLoaded] = useState<any[]>();

  // useEffectOnce(() => {
  //   new Asset(mesh2Asset).get();
  //   new Asset(meshAsset).get<THREE.Mesh>().then(mesh => {
  //     setAsset(mesh);
  //   });
  // });

  // print('rerender');

  useEffect(() => {
    if (files.length === 0) {
      return;
    }

    console.log('File changed', files);
    const assets = new Set(
      files.map(file => {
        console.log('Asset.from called');
        // const fileid = Hasher.hash(file);
        return Asset.fromFile(file);
      }),
    );
    print(assets);
    setAsset([...assets]);
    // print(assets.map(asset => asset.toJson()));
  }, [files]);

  const animRef = useRef<number | null>(null);
  const envRef = useRef<Promise<THREE.Texture> | null>(null);

  useEffect(() => {
    if (!envRef.current) {
      envRef.current = new RGBELoader()
        .loadAsync('/dancing_hall_1k.hdr')
        .then(t => {
          t.mapping = THREE.EquirectangularReflectionMapping;
          t.anisotropy = 16;
          t.magFilter = THREE.LinearFilter;
          t.minFilter = THREE.LinearFilter;
          t.needsUpdate = true;
          return t;
        });
    }

    if (canvasContainerRef.current) {
      VRenderer.init(canvasContainerRef.current);

      if (!animRef.current) {
        const animate = () => {
          VRenderer.render();
          animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
      }
    }

    return () => {
      // clean up
      VRenderer.cleanup();

      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (useEnv) {
      envRef.current?.then(t => {
        console.log('env loaded', t);
        VRenderer.scene.environment = t;
        VRenderer.scene.environmentIntensity = 1;
        VRenderer.scene.environment.needsUpdate = true;

        console.log(VRenderer.scene);
      });
    } else {
      VRenderer.scene.environment = null;
    }
  }, [useEnv]);

  return (
    <div
      className="fullscreen flex"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* <TestSceneChange /> */}
      <div className="flex-1">
        <div>
          <h3>Drag&Drop Assets</h3>
          <button
            onClick={async () => {
              const start = performance.now();

              Promise.all(
                asset
                  .filter(a => a.isGlb)
                  .map((a, assetIndex) =>
                    a.load<THREE.Group>().then(g => {
                      const start = performance.now();

                      g.traverse(c => {
                        if (c.asMesh.isMesh) {
                          c.frustumCulled = false;
                        }
                      });

                      // return g;
                      const { renderer: gl, camera: cam, scene } = VRenderer;
                      return gl.compileAsync(g, cam, scene).then(() => {
                        const end = performance.now();
                        console.log(
                          `[${assetIndex + 1}] CompileAsync`,
                          end - start,
                          'ms',
                          g,
                        );

                        VRenderer.scene.add(g);

                        return g;
                      });
                    }),
                  ),
              ).then(groups => {
                const end = performance.now();
                console.log('glb 로드 완료', end - start, 'ms', groups);
                // sceneRef.current.add(...groups);
                // VRenderer.scene.add(...groups);

                // // groups.forEach(g => g.position.addScalar(2));
                // const meshes = groups.map(g => g.flattendMeshes()).flat();

                // sceneRef.current.add(...meshes);

                // const startToasset = performance.now();
                // sceneRef.current.toAsset().then(a => {
                //   const endTooasset = performance.now();
                //   console.log('toAsset', endTooasset - startToasset, 'ms', a);

                //   const startInflate = performance.now();
                //   a.vfileInflated().then(vfileInflated => {
                //     const endInflate = performance.now();
                //     console.log('vfile inflated', vfileInflated);
                //     console.log(
                //       'inflate',
                //       endInflate - startInflate,
                //       'ms',
                //       vfileInflated,
                //     );

                //     let idx = 1;
                //     console.log('From here');
                //     // debugger;
                //     const idCount = new Map<string, number>();
                //     const upsert = (id: string) => {
                //       const count = idCount.get(id) ?? 0;
                //       idCount.set(id, count + 1);
                //     };
                //     const buffersOfSameLength = new Map<number, string[]>();

                //     iterateWithPredicate<VRemoteFile>(
                //       vfileInflated,
                //       isVRemoteFile,
                //       (geo, path) => {
                //         vfileInflated;
                //         const asset = Asset.fromId(geo.id);
                //         upsert(geo.id);
                //         const dataArray = asset.result as DataArray;
                //         if (!dataArray) {
                //           debugger;
                //         }
                //         console.log(
                //           idx++,
                //           geo.id,
                //           geo.format,
                //           dataArray.byteLength,
                //           path.join('/'),
                //         );

                //         const len = dataArray.byteLength;
                //         if (!buffersOfSameLength.has(len)) {
                //           buffersOfSameLength.set(len, []);
                //         }
                //         const ids = buffersOfSameLength.get(len)!;
                //         ids.push(geo.id);
                //       },
                //     );
                //     console.log('idCount', idCount);
                //     console.log('buffersOfSameLength', buffersOfSameLength);
                //     for (const [key, value] of idCount.entries()) {
                //       if (value > 1) {
                //         console.log(key, value);
                //       }
                //     }
                //   });
                // });
              });
            }}
          >
            GLB만 로드
          </button>
          <button
            onClick={async () => {
              const start = performance.now();
              const theGroup = new THREE.Group();
              const meshAssetStart = performance.now();
              VRenderer.scene.flattendMeshes().forEach(m => {
                theGroup.add(m);
              });

              theGroup.toAsset().then(sceneAsset => {
                const end = performance.now();
                console.log('toAsset', end - meshAssetStart, 'ms', sceneAsset);

                const thisScene: VFile<VScene> = {
                  id: SCENE_ID,
                  type: 'VScene',
                  isVFile: true,
                  data: {
                    id: SCENE_ID,
                    root: sceneAsset.vfile,
                  },
                };

                const sceneUploadStart = performance.now();
                Asset.fromVFile(thisScene)
                  .upload()
                  .then(() => {
                    const sceneUploadEnd = performance.now();
                    console.log(
                      'Scene upload',
                      sceneUploadEnd - sceneUploadStart,
                      'ms',
                      thisScene,
                    );
                    alert('FInished');
                  });

                // console.log('toAsset', end - start, 'ms', sceneAsset);
                // const startInflate = performance.now();
                // sceneAsset.vfileInflated().then(vfileInflated => {
                //   const endInflate = performance.now();
                //   console.log('vfile inflated', vfileInflated);
                //   console.log(
                //     'inflate',
                //     endInflate - startInflate,
                //     'ms',
                //     vfileInflated,
                //   );
                //   iterateWithPredicate<any>(
                //     vfileInflated,
                //     obj => {
                //       // return isVFile(obj) && obj.type === 'VBufferGeometry';
                //       return Boolean(obj?.normal) && Boolean(obj?.position);
                //     },
                //     (vfile, path) => {
                //       console.log('vfile', path.join('/'), vfile);
                //     },
                //   );
                // });
              });
            }}
          >
            To Asset
          </button>
          <button
            onClick={() => {
              const start = performance.now();
              // const id = '676b1495c15b43585b81db633f4d042ff6e0f8f7';
              const vremotefile: VRemoteFile = {
                id: SCENE_ID,
                format: 'json',
                isVRemoteFile: true,
              };
              const target = '9091745aa44bef0fe1246aca728263e21c96de0c';
              Asset.fromVRemoteFile(vremotefile)
                .prepare()
                .then(async a => {
                  const end = performance.now();
                  console.log('Asset fromId', end - start, 'ms', a);

                  // const infl = await a.vfileInflated();
                  // iterateWithPredicate(
                  //   infl,
                  //   o => {
                  //     return o?.id === target;
                  //   },
                  //   (o, path, parent) => {
                  //     debugger;
                  //   },
                  // );

                  // const infl = await a.vfileInflated();
                  // iterateWithPredicate<VRemoteFile>(
                  //   infl,
                  //   isVRemoteFile,
                  //   vremotefile => {
                  //     console.log('vremote file', vremotefile);
                  //   },
                  // );
                  // console.log('inflated', infl);

                  const scene: VFile<VScene> = a.vfile;
                  console.log('scene', scene);
                  const rootObj = Asset.fromVFile(scene.data.root);

                  const loadStart = performance.now();
                  return rootObj.load<THREE.Group>().then(g => {
                    const loadEnd = performance.now();
                    console.log('Asset load', loadEnd - loadStart, 'ms', g);
                    VRenderer.scene.add(g);
                  });
                });
            }}
          >
            Load Asset
          </button>
          <button
            onClick={() => {
              const id = '9091745aa44bef0fe1246aca728263e21c96de0c';
              const remote: VRemoteFile = {
                id,
                format: 'buffer',
                isVRemoteFile: true,
              };
              Asset.fromVRemoteFile(remote)
                .prepare()
                .then(a => {
                  console.log(a.payload);
                });
            }}
          >
            DEBUGGING
          </button>
          <button
            onClick={() => {
              setUseEnv(prev => !prev);
            }}
          >
            ENV : {useEnv ? 'ON -> OFF' : 'OFF -> ON'}
          </button>

          <button
            onClick={() => {
              const urls = [
                // 'MAINBED _HG.glb',
                // 'MAINBED _M.glb',
                // 'MAINBED _M2.glb',
                // 'MAINBED..base.door.glb',
                // 'MAINBED..base.glb',
                // 'MAINBED..PT.glb',
                // 'option 라이브월 base E.glb',
                // 'option 라이브월 base.glb',
                // 'option 라이브월 base2.glb',
                // 'Pantry_base.glb',
                '주방base.001.glb',
                '주방base.002.glb',
                '주방base.M.glb',
                '주방DP METAL.glb',
                '주방DP METAL2.glb',
                '주방DP 냉장고수납장.glb',
              ];
              const loader = VGLTFLoader.instance;
              urls.forEach(url =>
                loader.load(url, gltf => {
                  console.log(gltf.scene);
                  VRenderer.scene.add(gltf.scene);
                }),
              );
            }}
          >
            GLB쌩로드
          </button>
        </div>
        {/* <ObjectViewer data={asset}></ObjectViewer> */}
        <ul>
          {asset.map((a, i) => {
            return (
              <li key={`list-${a.id}`}>
                {i + 1}. {a.fileName} -{' '}
                {formatNumber(a.file.size / (1024 * 1024))}mb
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex-1 h-full" ref={canvasContainerRef}>
        {/* <Canvas
          scene={sceneRef.current}
          gl={glRef.current}
          camera={camRef.current}
        >
          <CallLoader></CallLoader>
          <OrbitControls
            args={[camRef.current, glRef.current.domElement]}
          ></OrbitControls>
          {useEnv && <Environment preset="apartment"></Environment>}
        </Canvas> */}
      </div>
    </div>
  );
}

export default TestPage;
