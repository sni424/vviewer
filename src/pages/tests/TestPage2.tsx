import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import ObjectViewer from 'src/components/ObjectViewer';
import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import Asset, { VRemoteAsset } from 'src/scripts/manager/Asset';
import BufferGeometryLoader from 'src/scripts/manager/assets/BufferGeometryLoader';
import MaterialLoader from 'src/scripts/manager/assets/MaterialLoader';
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
              const texes = await Promise.all(
                asset.filter(a => a.isTexture).map(a => a.get<THREE.Texture>()),
              );
              // texes.then(texes => {
              //   if (texes.length === 0) {
              //     return;
              //   }

              // });
              asset
                .filter(a => a.isGlb)
                .map(a => a.get<THREE.Group>())
                .forEach(a => {
                  a.then(a => {
                    a.toAsset().then(vfile => {
                      console.log({ object3d: vfile });
                    });

                    if (texes.length > 0) {
                      a.meshes().forEach(m => {
                        texes[0].channel = 1;
                        m.matStandard.lightMap = texes[0];
                      });
                    }
                    sceneRef.current.add(a);
                    a.meshes().forEach(async m => {
                      console.log({ mesh: await m.toAsset() });
                      Promise.all([
                        m.geometry.toAsset(),
                        m.matStandard.toAsset(),
                      ]).then(([geoAsset, matAsset]) => {
                        Promise.all([
                          BufferGeometryLoader(geoAsset),
                          MaterialLoader(matAsset),
                        ]).then(([geo, mat]) => {
                          const newMesh = new THREE.Mesh(geo, mat);
                          newMesh.position.add(new THREE.Vector3(0, 3, 0));
                          sceneRef.current.add(newMesh);
                        });
                      });
                    });

                    // texes.then(tex => {
                    //   if (tex.length === 0) {
                    //     return;
                    //   }
                    //   a.traverse(o => {
                    //     if (o.asMesh.isMesh) {
                    //       tex[0].channel = 1;
                    //       o.asMesh.matStandard.lightMap = tex[0];
                    //       debugger;
                    //       o.asMesh.geometry.toAsset().then(geo => {
                    //         BufferGeometryLoader(geo).then(loaded => {
                    //           console.log({ geo, loaded });
                    //         });
                    //       });
                    //     }
                    //   });
                    // });
                  });
                });
            }}
          >
            화면에 추가
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
          {loadedMat && (
            <button
              onClick={() => {
                sceneRef.current.traverse(o => {
                  if (o.asMesh.isMesh) {
                    console.log('org:', o.asMesh.matStandard.map);
                    // console.log('new:', loadedMat.map);
                    // o.asMesh.material = loadedMat;

                    //box
                    const newmesh = new THREE.Mesh(
                      new THREE.BoxGeometry(1, 1, 1),
                      loadedMat,
                    );
                    newmesh.position.set(1, 0, 0);
                    sceneRef.current.add(newmesh);

                    const newer = o.clone() as THREE.Mesh;
                    newer.position.add(new THREE.Vector3(0, 0, 10));
                    newer.material = loadedMat;
                    sceneRef.current.add(newer);
                  }
                });
              }}
            >
              재질적용
            </button>
          )}
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
