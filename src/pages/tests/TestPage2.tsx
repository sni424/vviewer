import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import ObjectViewer from 'src/components/ObjectViewer';
import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import _Asset from 'src/scripts/manager/_Asset';
import { _AssetMgr } from 'src/scripts/manager/assets/_AssetMgr';
import { DataArray, isDataArray } from 'src/scripts/manager/assets/AssetTypes';
import { iterateWithPredicate } from 'src/scripts/manager/assets/AssetUtils';
import {
  isVFile,
  isVRemoteFile,
  VFile,
  VRemoteFile,
} from 'src/scripts/manager/assets/VFile';
import { VObject3D } from 'src/scripts/manager/assets/VObject3D';
import { THREE } from 'VTHREE';
import useTestModelDragAndDrop from './useTestModelDragAndDrop';

const mgr = _AssetMgr;
const print = console.log;
interface UploadResponse {
  message: string;
  filePath: string;
  error?: string;
}

const getFilePath = (path: string) => `${_AssetMgr.projectId}/${path}`;

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
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const [asset, setAsset] = useState<_Asset[]>([]);
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
        return _Asset.from(file);
      }),
    );
    print(assets);
    setAsset([...assets]);
    // print(assets.map(asset => asset.toJson()));
  }, [files]);

  const applyExr = async () => {
    const glbs = asset
      .filter(a => a.isGlb)
      .map(a => {
        return {
          name: a.filename!,
          glb: a.load<THREE.Group>(),
        };
      });

    return Promise.all(
      asset
        .filter(a => a.isMap)
        .map(a => {
          return a.load<THREE.Texture>().then(tex => {
            tex.anisotropy = 16;
            tex.channel = 1;
            tex.flipY = true;
            tex.needsUpdate = true;

            const basename = a
              .filename!.split('/')
              .pop()!
              .split('.')
              .slice(0, -1)
              .join('.');

            const candidates = Array.from(
              new Set(
                [
                  basename,
                  basename.split('_Bake')[0],
                  basename.split('__')[0],
                ].map(c => c + '.glb'),
              ),
            );
            console.log(candidates);

            const foundGlb = glbs.find(glb => {
              const found = candidates.some(fn => glb.name.endsWith(fn));
              return found;
            });

            if (!foundGlb) {
              debugger;
            }

            foundGlb?.glb.then(g => {
              g.materials().forEach(m => {
                m.standard.lightMap = tex;
                m.standard.lightMapIntensity = 1;
                m.needsUpdate = true;
              });
            });
          });
        }),
    ).then(() => {
      setUseEnv(false);
    });
  };

  const addToScene = async () => {
    asset
      .filter(a => a.isGlb)
      .forEach(a =>
        a.load<THREE.Group>().then(a => {
          sceneRef.current.add(a);
        }),
      );
  };

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
                asset.filter(a => a.isGlb).map(a => a.load<THREE.Group>()),
              ).then(groups => {
                const end = performance.now();
                console.log('glb 로드 완료', end - start, 'ms', groups);
                // groups.forEach(g => g.position.addScalar(2));
                const meshes = groups.map(g => g.flattendMeshes()).flat();
                sceneRef.current.add(...meshes);
              });
            }}
          >
            GLB만 로드
          </button>
          <button
            onClick={() => {
              const start = performance.now();
              Promise.all(
                asset.filter(a => a.isMap).map(a => a.load<THREE.Texture>()),
              ).then(textures => {
                const end = performance.now();
                console.log(textures);
                console.log('map 로드 완료', end - start, 'ms');
                textures.forEach(tex => {
                  tex.anisotropy = 16;
                  tex.flipY = true;
                  tex.needsUpdate = true;
                });
              });
            }}
          >
            EXR만 로드
          </button>
          <button
            onClick={async () => {
              const start = performance.now();
              sceneRef.current.name = 'main';

              // const meshes = sceneRef.current.flattendMeshes();
              // debugger;
              // const assets = await Promise.all(
              //   meshes.map(m => m.toAsset().then(a => a.result)),
              // );
              // console.log(assets);

              sceneRef.current.toAsset().then(async asset => {
                const end = performance.now();
                console.log('씬 toAsset()', end - start, 'ms');
                console.log(asset.vfile);
                // debugger;

                const remotes: [VRemoteFile, VFile | DataArray][] = [];
                const getArrayBufferRecursive = (
                  vfiles: VFile<VObject3D>[],
                ) => {
                  const innerVFiles: VFile[] = [];
                  vfiles.forEach(vfile => {
                    if (!isVFile(vfile)) {
                      return;
                    }
                    iterateWithPredicate(
                      vfile,
                      o => isVRemoteFile(o),
                      (value: VRemoteFile) => {
                        let result: VFile | DataArray;
                        if (value.format === 'json') {
                          const innerVfile = _Asset.from(value).vfile!;
                          if (!isVFile(innerVfile)) {
                            debugger;
                          }
                          innerVFiles.push(innerVfile);
                          result = innerVfile;
                        } else {
                          result = _Asset.from(value).result;
                        }

                        remotes.push([value, result]);
                      },
                    );
                  });
                  if (innerVFiles.length === 0) {
                    return;
                  }
                  getArrayBufferRecursive(innerVFiles);
                };
                getArrayBufferRecursive([asset.vfile]);

                remotes.push([asset.vremotefile, asset.vfile]);
                console.log(remotes);
                console.log(asset.id);

                const proms: Promise<any>[] = [];
                remotes.forEach(([remote, data]) => {
                  proms.push(
                    upload(
                      remote.id,
                      data,
                      remote.format === 'json' ? 'json' : 'binary',
                    ),
                  );
                });
                Promise.all(proms).then(res => {
                  console.log(res);
                });

                // const downloadStart = performance.now();
                // const uploadable = (await asset.download())!;
                // const downloadEnd = performance.now();
                // const { self, children } = uploadable;
                // console.log('씬 다운로드', downloadEnd - downloadStart, 'ms');
                // console.log({ self, children });

                // const compress = false;
                // const inflated = await Asset.from(
                //   uploadable.self.data,
                // ).inflate();
                // print({ inflated });
                // const arr = serialize(inflated, compress);

                // // !TODO : TextureLoader 등에서 VRemoteFile대신 DataArray들어올 때 핸들링

                // console.log('start upload');
                // upload('scene_test.vo', arr)
                //   .then(res => {
                //     console.log(res);
                //   })
                //   .finally(() => {
                //     const end = performance.now();
                //     console.log('씬 업로드', end - downloadStart, 'ms');
                //   });
              });
            }}
          >
            ToAsset + Download
          </button>
          <button
            onClick={async () => {
              const objId = 'b6882bfe8520994cbf7eec5abb238108fdbd6204';

              {
                // const start = performance.now();
                // const graph = await download<DownloadWithChildren>(objId, {
                //   type: 'json',
                //   withChildren: true,
                // });
                // const end = performance.now();
                // console.log('다운로드 완료', end - start, 'ms', graph);
                // const { self, vfiles, vremotefiles } = graph;
                // Asset.from(self);
                // vfiles.forEach(Asset.from);
                // vremotefiles.forEach(Asset.from);
              }

              _Asset
                .from(objId)
                .load<THREE.Group>()
                .then(g => {
                  console.log(g);
                });

              // debugger;
            }}
          >
            VO 로드
          </button>
          <button
            onClick={() => {
              const vremote = {
                isVRemoteFile: true,
                id: '0938de5d-3f9a-4cee-90a6-5834e3a53649',
                format: 'Float32Array',
              };
              _Asset.from(vremote);
            }}
          >
            Array로드
          </button>
          <button
            onClick={() => {
              function clearScene(scene: THREE.Scene) {
                scene.traverse(object => {
                  if ((object as THREE.Mesh).geometry) {
                    (object as THREE.Mesh).geometry.dispose();
                  }
                  if ((object as THREE.Mesh).material) {
                    const material = (object as THREE.Mesh).material;
                    if (Array.isArray(material)) {
                      material.forEach(m => m.dispose());
                    } else {
                      material.dispose();
                    }
                  }
                  if ((object as THREE.Mesh).type === 'Mesh') {
                    // dispose texture도 여기에 추가 가능
                  }
                });

                while (scene.children.length > 0) {
                  scene.remove(scene.children[0]);
                }
              }

              clearScene(sceneRef.current);
            }}
          >
            씬 삭제
          </button>
          <button
            onClick={async () => {
              // const texs = await Promise.all(
              //   asset.filter(a => a.isMap).map(a => a.load<THREE.Texture>()),
              // );
              // asset
              //   .filter(a => a.isGlb)
              //   .forEach(a =>
              //     a.load<THREE.Group>().then(a => {
              //       a.toAsset().then(vfile => {
              //         ObjectLoader(vfile).then(loaded => {
              //           if (texs.length > 0) {
              //             const tex = texs[0];
              //             console.log(tex.vUserData);
              //             tex.channel = 1;
              //             loaded.meshes().forEach(m => {
              //               m.matStandard.lightMap = tex;
              //             });
              //           }

              //           sceneRef.current.add(loaded);
              //         });
              //       });
              //     }),
              //   );
              const start = performance.now();
              // sceneRef.current.toAsset().then(vfile => {
              //   const end = performance.now();
              //   console.log('씬 에셋화', end - start, 'ms');
              // });
              const scene = sceneRef.current;
              const meshes = scene.meshes();
              const geometries = scene.geometries();
              const materials = scene.materials();
              const textures = scene.textures();

              const textureStart = performance.now();
              await Promise.all(
                textures.map(async (t, i) => {
                  const start = performance.now();
                  await t.toAsset();
                  const end = performance.now();
                  console.log(
                    `텍스쳐 에셋화 ${i + 1} / ${textures.length}`,
                    end - start,
                    'ms',
                  );
                }),
              );
              const textureEnd = performance.now();
              console.log('텍스쳐 에셋화', textureEnd - textureStart, 'ms');

              const geometryStart = performance.now();
              await Promise.all(geometries.map(g => g.toAsset()));
              const geometryEnd = performance.now();
              console.log(
                '지오메트리 에셋화',
                geometryEnd - geometryStart,
                'ms',
              );

              const materialStart = performance.now();
              await Promise.all(materials.map(m => m.toAsset()));
              const materialEnd = performance.now();
              console.log('머티리얼 에셋화', materialEnd - materialStart, 'ms');

              const meshStart = performance.now();
              await Promise.all(meshes.map(m => m.toAsset()));
              const meshEnd = performance.now();
              console.log('메쉬 에셋화', meshEnd - meshStart, 'ms');

              const sceneStart = performance.now();
              await scene.toAsset();
              const sceneEnd = performance.now();
              console.log('씬 에셋화', sceneEnd - sceneStart, 'ms');
            }}
          >
            씬 에셋화
          </button>

          <button
            onClick={() => {
              setUseEnv(prev => !prev);
            }}
          >
            ENV : {useEnv ? 'OFF' : 'ON'}
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
              const loader = new VGLTFLoader();
              urls.forEach(url =>
                loader.load(url, gltf => {
                  console.log(gltf.scene);
                  sceneRef.current.add(gltf.scene);
                }),
              );
            }}
          >
            GLB쌩로드
          </button>
        </div>
        <ObjectViewer data={asset}></ObjectViewer>
      </div>
      <div className="flex-1 h-full">
        <Canvas
          scene={sceneRef.current}
          gl={{
            powerPreference: 'high-performance',
          }}
        >
          <CallLoader></CallLoader>
          <OrbitControls></OrbitControls>
          {useEnv && <Environment preset="apartment"></Environment>}
        </Canvas>
      </div>
    </div>
  );
}

export default TestPage;
