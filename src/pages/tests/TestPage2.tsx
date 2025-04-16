import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import ObjectViewer from 'src/components/ObjectViewer';
import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import Asset, { VRemoteAsset } from 'src/scripts/manager/Asset';
import Fetcher from 'src/scripts/manager/assets/Fetcher';
import MaterialLoader from 'src/scripts/manager/assets/MaterialLoader';
import ObjectLoader from 'src/scripts/manager/assets/ObjectLoader';
import { VFile } from 'src/scripts/manager/assets/VFile';
import { THREE } from 'VTHREE';
import useTestModelDragAndDrop from './useTestModelDragAndDrop';

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

const tex1Asset: VRemoteAsset = {
  type: 'texture',
  id: 'tex1',
};

const tex2Asset: VRemoteAsset = {
  type: 'texture',
  id: 'tex2',
};

const matAsset: VRemoteAsset = {
  type: 'material',
  id: 'mat',
  textures: [tex1Asset, tex2Asset],
};

const geoAsset: VRemoteAsset = {
  type: 'geometry',
  id: 'geo',
};

const meshAsset: VRemoteAsset = {
  id: 'mesh',
  type: 'mesh',
  geometry: geoAsset,
  material: matAsset,
};

const mesh2Asset: VRemoteAsset = {
  id: 'mesh2',
  type: 'mesh',
  geometry: geoAsset,
  material: matAsset,
};

function TestPage() {
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
            onClick={() => {
              const start = performance.now();
              const proms = asset.map(a => a.get());
              print('Asset:', asset, proms);
              Promise.all(proms)
                .then(loadedAssets => {
                  // const hashStart = performance.now();
                  // Promise.all(loadedAssets.map(a => a.vUserData.hash)).then(
                  //   hash => {
                  //     const hashEnd = performance.now();
                  //     print('Hash:', hash, hashEnd - hashStart, 'ms');
                  //   },
                  // );
                  setLoaded(loadedAssets);
                  // debugger;
                })
                .finally(() => {
                  const end = performance.now();
                  print('Time taken:', end - start, 'ms');
                });
            }}
          >
            로드
          </button>
          <button
            onClick={async () => {
              // const texes = await Promise.all(
              //   asset.filter(a => a.isTexture).map(a => a.get<THREE.Texture>()),
              // );
              // texes.then(texes => {
              //   if (texes.length === 0) {
              //     return;
              //   }

              // });
              asset
                .filter(a => a.isGlb)
                .forEach(a =>
                  a.get<THREE.Group>().then(a => {
                    sceneRef.current.add(a);
                  }),
                );
            }}
          >
            화면에 추가
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
              const texs = await Promise.all(
                asset.filter(a => a.isMap).map(a => a.get<THREE.Texture>()),
              );
              asset
                .filter(a => a.isGlb)
                .forEach(a =>
                  a.get<THREE.Group>().then(a => {
                    a.toAsset().then(vfile => {
                      ObjectLoader(vfile).then(loaded => {
                        if (texs.length > 0) {
                          const tex = texs[0];
                          console.log(tex.vUserData);
                          tex.channel = 1;
                          loaded.meshes().forEach(m => {
                            m.matStandard.lightMap = tex;
                          });
                        }

                        sceneRef.current.add(loaded);
                      });
                    });
                  }),
                );
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
                Fetcher.fetch(url + '?' + i, false);
              }
            }}
          >
            Fetcher pool 테스트
          </button>
        </div>
        <ObjectViewer data={asset}></ObjectViewer>
      </div>
      <div className="flex-1 h-full">
        <Canvas scene={sceneRef.current}>
          <CallLoader></CallLoader>
          <OrbitControls></OrbitControls>
          <Environment preset="apartment"></Environment>
        </Canvas>
      </div>
    </div>
  );
}

export default TestPage;
