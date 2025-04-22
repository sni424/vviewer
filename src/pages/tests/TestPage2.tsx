import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import ObjectViewer from 'src/components/ObjectViewer';
import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import Asset from 'src/scripts/manager/Asset';
import { AssetMgr } from 'src/scripts/manager/assets/AssetMgr';
import MaterialLoader from 'src/scripts/manager/assets/MaterialLoader';
import { VFile, VRemoteFile } from 'src/scripts/manager/assets/VFile';
import Workers from 'src/scripts/manager/assets/Workers';
import { THREE } from 'VTHREE';
import useTestModelDragAndDrop from './useTestModelDragAndDrop';

const mgr = AssetMgr;
const print = console.log;

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
    const assets = new Set(files.map(file => Asset.create(file)));
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
          glb: a.get<THREE.Group>(),
        };
      });

    return Promise.all(
      asset
        .filter(a => a.isMap)
        .map(a => {
          return a.get<THREE.Texture>().then(tex => {
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
        a.get<THREE.Group>().then(a => {
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
              // const glbStart = performance.now();
              // const glbs = await Promise.all(
              //   asset
              //     .filter(a => a.isGlb)
              //     .map(a =>
              //       a.get<THREE.Group>().then(g => {
              //         g.meshes().forEach(m => {
              //           m.frustumCulled = false;
              //         });
              //         return g;
              //       }),
              //     ),
              // );
              // const glbEnd = performance.now();

              const mapStart = performance.now();
              const maps = await Promise.all(
                asset
                  .filter(a => a.isMap)
                  .map(a =>
                    a.get<THREE.Texture>().then(tex => {
                      tex.anisotropy = 16;
                      tex.flipY = true;
                      tex.needsUpdate = true;
                      return tex;
                    }),
                  ),
              )
                .then(applyExr)
                .then(addToScene)
                .finally(() => {
                  const mapEnd = performance.now();

                  console.log('map', mapEnd - mapStart, 'ms');
                });
            }}
          >
            로드만
          </button>
          <button onClick={addToScene}>화면에 추가</button>
          <button onClick={applyExr}>EXR 적용</button>
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
              //   asset.filter(a => a.isMap).map(a => a.get<THREE.Texture>()),
              // );
              // asset
              //   .filter(a => a.isGlb)
              //   .forEach(a =>
              //     a.get<THREE.Group>().then(a => {
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
              const proms: Promise<VFile>[] = [];
              const vfiles: VFile[] = [];
              // sceneRef.current.traverse(o => {
              //   if (o.asMesh.isMesh) {
              //     o.geometries().forEach(g => {
              //       proms.push(g.toAsset());
              //     });
              //     o.asMesh.matStandard.textures().forEach(t => {
              //       proms.push(t.toAsset());
              //     });

              //     o.asMesh.matStandard.toAsset().then(mat => {
              //       console.log({ mat });
              //       // MaterialLoader(mat).then(loaded => {
              //       //   debugger;
              //       //   console.log({ loaded });
              //       //   // // debugger;
              //       //   // const box = new THREE.Mesh(
              //       //   //   new THREE.BoxGeometry(1, 1, 1),
              //       //   //   loaded,
              //       //   // );
              //       //   // sceneRef.current.add(box);
              //       //   sceneRef.current.traverse(o => {
              //       //     if (o.asMesh.isMesh) {
              //       //       o.asMesh.material = loaded;
              //       //     }
              //       //   });
              //       // });
              //     });
              //   }
              // });

              sceneRef.current.traverse(o => {
                if (o.asMesh.isMesh) {
                  const mesh = o.asMesh;
                  const mat = mesh.matStandard;
                  mat.toAsset().then(vfile => {
                    MaterialLoader(vfile).then(setLoadedMat);
                  });
                }
              });

              console.log('Textures:', vfiles);

              // Promise.all(proms).then(async res => {
              //   // TextureLoader(res[1]).then(loaded => {
              //   //   console.log('loaded', loaded);
              //   //   loaded.flipY = false;

              //   //   // add new box to the scene
              //   //   const material = new THREE.MeshStandardMaterial({
              //   //     map: loaded,
              //   //   });
              //   //   const box = new THREE.Mesh(
              //   //     new THREE.BoxGeometry(1, 1, 1),
              //   //     material,
              //   //   );
              //   //   sceneRef.current.add(box);
              //   // });

              //   const arrayId = res[0].data.data!.index!.array;

              //   // const ab = await AssetMgr.get(arrayId);

              //   console.log(
              //     'geometries',
              //     arrayId,
              //     res,
              //     // ab,
              //     // AssetMgr.cache.keys(),
              //   );
              // });
            }}
          >
            업로드
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
          <button
            onClick={() => {
              const ab = new ArrayBuffer(8);
              const abp = new Promise(res =>
                setTimeout(() => {
                  res(new ArrayBuffer(80));
                }, 5000),
              );
              const vfile: VFile = {
                id: 'vfile',
                type: 'VBufferGeometry',
                data: {},
              };
              const vfile2 = vfile;
              const vremotefile: VRemoteFile = {
                id: 'vremotefile',
                format: 'json',
              };

              const commonObject = {};

              if (!mgr.get(ab)) {
                console.log('set ab', ab);
                mgr.set('ab', ab);
              }
              if (!mgr.get(vfile)) {
                console.log('set vfile', vfile);
                mgr.set(vfile);
              }
              if (!mgr.get(vfile2)) {
                console.log('set vfile2', vfile2);
                mgr.set(vfile2);
              }
              if (!mgr.get(vremotefile)) {
                console.log('set vremotefile', vremotefile);
                mgr.set(vremotefile);
              }
              if (!mgr.get('commonObject')) {
                console.log('set commonObject', commonObject);
                mgr.set('commonObject', commonObject);
              }
              if (!mgr.get(abp)) {
                console.log('set abp', abp);
                mgr.set('abp', abp);
              }

              mgr.set(
                'all',
                ab,
                vfile,
                vremotefile,
                commonObject,
                new THREE.Material(),
              );

              console.log(
                mgr.get(ab),
                mgr.get(vfile),
                mgr.get(vfile2),
                mgr.get(vremotefile),
                mgr.get(commonObject),
                mgr.get('ab'),
                mgr.get('vfile'),
                mgr.get('vremotefile'),
                mgr.get('commonObject'),
                mgr.get('abp'),
                mgr.get('all'),
              );
              mgr.getCacheAsync('abp').then(res => {
                console.log('abp', res);
              });
            }}
          >
            캐시시스템
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
