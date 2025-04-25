import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import ObjectViewer from 'src/components/ObjectViewer';
import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import Asset, { VUploadable } from 'src/scripts/manager/Asset';
import { AssetMgr } from 'src/scripts/manager/assets/AssetMgr';
import ObjectLoader from 'src/scripts/manager/assets/ObjectLoader';
import { deserialize, serialize } from 'src/scripts/manager/assets/Serializer';
import {
  isVFile,
  isVRemoteFile,
  VFile,
  VRemoteFile,
} from 'src/scripts/manager/assets/VFile';
import Workers from 'src/scripts/manager/assets/Workers';
import { THREE } from 'VTHREE';
import useTestModelDragAndDrop from './useTestModelDragAndDrop';

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
  } else {
    // Create a Blob from ArrayBuffer
    file = new File([data as ArrayBuffer], filepath, {
      type: 'application/octet-stream',
    });
  }

  formData.append('data', file);
  formData.append('filepath', filepath);
  formData.append('type', type);

  return fetch('http://localhost:4000/save', {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  }).then(res => res.json() as Promise<UploadResponse>);
}

async function download<T>(
  id: string,
  type?: 'json' | 'binary',
  inflate?: boolean,
): Promise<T>;
async function download<T>(
  param: string | VFile | VRemoteFile,
  type?: 'json' | 'binary',
  inflate?: boolean,
) {
  if (typeof param === 'string') {
    if (!type || type === 'json') {
      let retval = fetch(
        `http://localhost:4000/retrieve?filepath=${getFilePath(param)}`,
      ).then(res => res.json());
      if (!type) {
        retval = retval.catch(() => {
          return Workers.fetch(`/${AssetMgr.projectId}/${param}`, inflate) as T;
        });
      }
      return retval;
    } else {
      // type === 'binary'
      return Workers.fetch(`/${getFilePath(param)}`, inflate) as T;
    }
  }

  const obj = param as VFile | VRemoteFile;

  if (isVFile(obj)) {
    return obj as T;
  }

  if (isVRemoteFile(obj)) {
    const file = obj as VRemoteFile;
    const isJson = file.format === 'json';

    if (isJson) {
      return fetch(`http://localhost:4000/retrieve?filepath=${file.id}`).then(
        res => res.json() as Promise<T>,
      );
    } else {
      return Workers.fetch(`/${AssetMgr.projectId}/${obj.id}`, inflate) as T;
    }
  }

  throw new Error('Invalid object type');
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
  const [asset, setAsset] = useState<Asset[]>([]);
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
        return Asset.from(file);
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
                groups.forEach(g => g.position.addScalar(2));
                sceneRef.current.add(...groups);
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
              sceneRef.current.toAsset().then(async asset => {
                const end = performance.now();
                console.log('씬 toAsset()', end - start, 'ms');
                console.log(asset.vfile);
                // debugger;

                const downloadStart = performance.now();
                const uploadable = (await asset.download())!;
                const downloadEnd = performance.now();
                const { self, children } = uploadable;
                console.log('씬 다운로드', downloadEnd - downloadStart, 'ms');
                console.log({ self, children });

                // const remotefiles = children.map(c => c.vremotefile);
                // const vscene: VFile<VScene> = {
                //   isVFile: true,
                //   id: self.vremotefile.id,
                //   type: 'VScene',
                //   data: {
                //     object: self.vremotefile,
                //   },
                // };
                // const vproject: VFile<VProject> = {
                //   isVFile: true,
                //   id: AssetMgr.projectId,
                //   type: 'VProject',
                //   data: {
                //     files: remotefiles,
                //     rootScenes: [vscene],
                //     option: {
                //       defaultOption: {
                //         isVFile: true,
                //         id: 'default',
                //         type: 'VOption',
                //         data: { scene: vscene } as VOption,
                //       } as VFile<VOption>,
                //       options: [] as VLoadable<VOption>[],
                //     } as VProject['option'],
                //   } as VProject,
                // };

                // const inflateStart = performance.now();
                // const inflated = await AssetMgr.inflate(
                //   uploadable.self.data as VFile,
                // );
                // const inflateEnd = performance.now();
                // console.log(
                //   'inflate',
                //   inflateEnd - inflateStart,
                //   'ms',
                //   inflated,
                // );

                const compress = true;
                const inflated = await Asset.from(
                  uploadable.self.data,
                ).inflate();
                print({ inflated });
                const arr = serialize(inflated, compress);

                // !TODO : TextureLoader 등에서 VRemoteFile대신 DataArray들어올 때 핸들링

                console.log('start upload');
                upload('scene_test.vo', arr)
                  .then(res => {
                    console.log(res);
                  })
                  .finally(() => {
                    const end = performance.now();
                    console.log('씬 업로드', end - downloadStart, 'ms');
                  });
              });
            }}
          >
            ToAsset + Download
          </button>
          <button
            onClick={async () => {
              type Response = { self: VUploadable; children: VUploadable[] };
              download<ArrayBuffer>('scene_test.vo', 'binary', true)
                .then(deserialize<VFile>)
                .then(async res => {
                  console.log(res);
                  const obj = await ObjectLoader(res);
                  print({ obj });
                  sceneRef.current.add(obj);
                });
              // download<Response>('scene_test.json').then(res => {
              //   console.log(res);
              //   const { self, children } = res;
              //   children.forEach(c => {
              //     if (c.vremotefile.format === 'json') {
              //       return;
              //     }
              //     const format = c.vremotefile.format;
              //     if (TYPED_ARRAY_NAMES.includes(format as any)) {
              //       const org = c.data as { [key: number]: number };
              //       const length = Object.keys(org).length;

              //       const arr = new (TYPED_ARRAYS as any)[format](length);

              //       // Assign values to Float32Array (assume keys are sequential)
              //       for (let i = 0; i < length; i++) {
              //         if (i in org) {
              //           arr[i] = org[i];
              //         } else {
              //           throw new Error(`Missing key ${i} in input object`);
              //         }
              //       }

              //       // Return the underlying ArrayBuffer
              //       c.data = arr;
              //     } else if (format === 'buffer') {
              //       const org = c.data as { [key: number]: number };
              //       const length = Object.keys(org).length;

              //       const arr = new Uint8Array(length);

              //       // Assign values to Float32Array (assume keys are sequential)
              //       for (let i = 0; i < length; i++) {
              //         if (i in org) {
              //           arr[i] = org[i];
              //         } else {
              //           throw new Error(`Missing key ${i} in input object`);
              //         }
              //       }

              //       // Return the underlying ArrayBuffer
              //       c.data = arr.buffer;
              //     }
              //   });
              //   console.log(res);
              // });
            }}
          >
            VO 로드
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
              const id = 'test.json';
              const binaryId = 'test.bin';
              const obj = {
                hi: 'hod',
              };

              // json 테스트
              // {
              //   upload(id, obj).then(res => {
              //     if (res.error) {
              //       console.error(res.error);
              //     } else {
              //       download(id).then(res => {
              //         console.log('downloaded : ', res);
              //       });
              //     }
              //   });
              // }

              // binary 테스트
              {
                const buffer = new ArrayBuffer(8);
                const typedArray = new Uint8Array(buffer);
                typedArray.set([1, 2, 3, 4, 5, 6, 7, 8]);
                upload(binaryId, typedArray).then(res => {
                  if (res.error) {
                    console.error(res.error);
                  } else {
                    download(binaryId, 'binary').then(res => {
                      console.log('downloaded : ', res);
                    });
                  }
                });
              }
            }}
          >
            업로드/다운로드 테스트
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
