import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import ObjectViewer from 'src/components/ObjectViewer';
import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import Asset, { VUploadable } from 'src/scripts/manager/Asset';
import { AssetMgr } from 'src/scripts/manager/assets/AssetMgr';
import { deserialize, serialize } from 'src/scripts/manager/assets/Serializer';
import { VFile, VLoadable } from 'src/scripts/manager/assets/VFile';
import { VOption } from 'src/scripts/manager/assets/VOption';
import { VProject } from 'src/scripts/manager/assets/VProject';
import { VScene } from 'src/scripts/manager/assets/VScene';
import Workers from 'src/scripts/manager/assets/Workers';
import { THREE } from 'VTHREE';
import useTestModelDragAndDrop from './useTestModelDragAndDrop';

const mgr = AssetMgr;
const print = console.log;

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
                console.log('glb 로드 완료', end - start, 'ms');
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
              sceneRef.current.toAsset().then(async asset => {
                const end = performance.now();
                console.log('씬 toAsset()', end - start, 'ms');
                console.log(asset.vfile);

                const downloadStart = performance.now();
                const uploadable = (await asset.download())!;
                const downloadEnd = performance.now();
                const { self, children } = uploadable;
                console.log('씬 다운로드', downloadEnd - downloadStart, 'ms');
                console.log({ self, children });

                const remotefiles = children.map(c => c.vremotefile);
                const vscene: VFile<VScene> = {
                  isVFile: true,
                  id: self.vremotefile.id,
                  type: 'VScene',
                  data: {
                    object: self.vremotefile,
                  },
                };
                const vproject: VFile<VProject> = {
                  isVFile: true,
                  id: AssetMgr.projectId,
                  type: 'VProject',
                  data: {
                    files: remotefiles,
                    rootScenes: [vscene],
                    option: {
                      defaultOption: {
                        isVFile: true,
                        id: 'default',
                        type: 'VOption',
                        data: { scene: vscene } as VOption,
                      } as VFile<VOption>,
                      options: [] as VLoadable<VOption>[],
                    } as VProject['option'],
                  } as VProject,
                };

                const compress = true;

                const arr = serialize(uploadable, compress);

                const upload = async (uploadable: VUploadable) => {
                  const { vremotefile, data } = uploadable;

                  const type =
                    vremotefile.format === 'json' ? 'json' : 'binary';

                  const formData = new FormData();
                  formData.append(
                    'data',
                    new Blob([arr], { type: 'application/octet-stream' }),
                    'data.bin',
                  );
                  const filepath = '/' + AssetMgr.projectId + '/scene.vo';
                  formData.append('filepath', filepath);
                  formData.append('type', type);

                  return fetch('http://localhost:4000/save', {
                    method: 'POST',
                    body: formData,
                  })
                    .then(res => res.json())
                    .then(async res => {
                      if (!res.ok) {
                        throw new Error(res.error || 'Failed to save file');
                      } else {
                        console.log('File saved:', res.filePath);

                        // 업로드한 것과 다운로드한 것이 동일한지 확인
                        {
                          const ab = await Workers.fetch(filepath, compress);
                          console.log('size : ', ab.byteLength / 1024, 'KB');
                          const des = deserialize<VFile>(ab);
                          console.log(des);
                          const equal = deepEqual(uploadable, des);
                          console.log('씬 deepEqual', equal ? 'OK' : 'FAIL');
                        }
                      }
                    });
                };

                // const inflateStart = performance.now();
                // AssetMgr.inflate(a.vfile).then(inflated => {
                //   const inflateEnd = performance.now();
                //   console.log('씬 inflate()', inflateEnd - inflateStart, 'ms');
                //   console.log({ inflated });
                //   const serialStart = performance.now();
                //   const inflate = true;
                //   const ab = serialize(inflated, inflate);
                //   const serialEnd = performance.now();
                //   console.log('씬 직렬화', serialEnd - serialStart, 'ms');

                //   const deserialStart = performance.now();
                //   const des = deserialize(ab.buffer, inflate);
                //   const deserialEnd = performance.now();
                //   console.log(
                //     '씬 디시리얼라이즈',
                //     deserialEnd - deserialStart,
                //     'ms',
                //   );
                //   console.log(des);

                //   const deStart = performance.now();
                //   const equal = deepEqual(inflated, des);
                //   const deEnd = performance.now();
                //   console.log(
                //     '씬 deepEqual',
                //     deEnd - deStart,
                //     'ms :',
                //     equal ? 'OK' : 'FAIL',
                //   );
                //   if (equal) {
                //     // download as a
                //     const a = document.createElement('a');
                //     a.href = URL.createObjectURL(
                //       new Blob([ab], { type: 'application/octet-stream' }),
                //     );
                //     a.download = 'scene.vo';
                //     a.click();
                //     URL.revokeObjectURL(a.href);
                //   } else {
                //     console.error('씬 deepEqual 실패', equal);
                //     debugger;
                //   }
                // });
              });
            }}
          >
            ToAsset + Download
          </button>
          <button
            onClick={async () => {
              const buffer = await Workers.fetch('/scene (2).vo', true);
              const start = performance.now();
              const vfile = deserialize<VFile>(buffer, false);
              const end = performance.now();
              console.log('씬 디시리얼라이즈', end - start, 'ms');
              console.log(vfile);
              Asset.from(vfile)
                .load<THREE.Group>()
                .then(g => {
                  sceneRef.current.add(g);
                });
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
              const url =
                'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf';
              for (let i = 0; i < 100; ++i) {
                Workers.fetch(url + '?' + i, false);
              }
            }}
          >
            Fetcher pool 테스트
          </button>
          <button
            onClick={() => {
              console.log(sceneRef.current);
              console.log(asset);
            }}
          >
            Scene
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
              // AssetMgr.downloadAll();
            }}
          >
            다운로드
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
