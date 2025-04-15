import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import ObjectViewer from 'src/components/ObjectViewer';
import Asset, { VRemoteAsset } from 'src/scripts/manager/Asset';
import MaterialLoader from 'src/scripts/manager/assets/MaterialLoader';
import { VFile } from 'src/scripts/manager/assets/VFile';
import { THREE } from 'VTHREE';
import useTestModelDragAndDrop from './useTestModelDragAndDrop';

const print = console.log;

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
            onClick={() => {
              asset
                .filter(a => a.isGlb)
                .forEach(a => {
                  a.onLoaded = (a, d) => {
                    console.log('onLoaded', a.id, d);
                  };
                  a.get<THREE.Mesh>().then(o => {
                    sceneRef.current.add(o);
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
              sceneRef.current.traverse(o => {
                if (o.asMesh.isMesh) {
                  o.geometries().forEach(g => {
                    proms.push(g.toAsset());
                  });
                  o.asMesh.matStandard.textures().forEach(t => {
                    proms.push(t.toAsset());
                  });

                  o.asMesh.matStandard.toAsset().then(mat => {
                    console.log({ mat });
                    MaterialLoader(mat).then(loaded => {
                      console.log({ loaded });
                      // debugger;
                      const box = new THREE.Mesh(
                        new THREE.BoxGeometry(1, 1, 1),
                        loaded,
                      );
                      sceneRef.current.add(box);
                    });
                  });
                }
              });
              console.log('Textures:', vfiles);

              Promise.all(proms).then(async res => {
                // TextureLoader(res[1]).then(loaded => {
                //   console.log('loaded', loaded);
                //   loaded.flipY = false;

                //   // add new box to the scene
                //   const material = new THREE.MeshStandardMaterial({
                //     map: loaded,
                //   });
                //   const box = new THREE.Mesh(
                //     new THREE.BoxGeometry(1, 1, 1),
                //     material,
                //   );
                //   sceneRef.current.add(box);
                // });

                const arrayId = res[0].data.data!.index!.array;

                // const ab = await AssetMgr.get(arrayId);

                console.log(
                  'geometries',
                  arrayId,
                  res,
                  // ab,
                  // AssetMgr.cache.keys(),
                );
              });
            }}
          >
            업로드
          </button>
          <button
            onClick={() => {
              const scene = sceneRef.current;
              const proms: Promise<any>[] = [];
              const start = performance.now();
              scene.traverse(o => {
                console.log(o.name);
                if (o.asMesh.isMesh) {
                  proms.push(o.asMesh.hash);
                }
              });
              Promise.all(proms).then(hashes => {
                const end = performance.now();
                console.log('해시 완료', hashes, end - start, 'ms');
                scene.traverse(o => {
                  if (o.asMesh.isMesh) {
                    console.log('filename', o.vUserData?.fileName);
                    const mesh = o.asMesh;
                    const geo = mesh.geometry;
                    const mat = mesh.matPhysical;
                    const tex = mat.textures();
                    const printHash = async () => {
                      print(mesh.name, await mesh.hash);
                      print('  - ', geo.name, await geo.hash);
                      print('  - ', mat.name, await mat.hash);
                      tex.forEach(async t => {
                        print('    - ', t.name, await t.hash);
                      });
                    };
                    printHash();
                    print('해시 완료', mesh, geo, mat, tex);
                  }
                });
              });
            }}
          >
            해시
          </button>
          <button
            onClick={() => {
              const geo = sceneRef.current.geometries();
              console.log(geo);
              geo.forEach(g => {
                console.log(g, g.toJSON());
              });

              const mats = sceneRef.current.materials();
              mats.forEach(m => {
                if (m.standard.map) {
                  m.standard.map.anisotropy = 5000;
                }
                console.log(m, m.toJSON());
              });
            }}
          >
            Geo
          </button>
        </div>
        <ObjectViewer data={asset}></ObjectViewer>
      </div>
      <div className="flex-1 h-full">
        <Canvas scene={sceneRef.current}>
          <OrbitControls></OrbitControls>
          <Environment preset="apartment"></Environment>
        </Canvas>
      </div>
    </div>
  );
}

export default TestPage;
