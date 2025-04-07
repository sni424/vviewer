import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import ObjectViewer from 'src/components/ObjectViewer';
import Asset, { VRemoteAsset } from 'src/scripts/manager/Asset';
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

function useModelDragAndDrop() {}

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
    const assets = files.map(file => new Asset(file));
    print(assets);
    setAsset(assets);
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
                  print(loadedAssets);
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
              Promise.all(asset.map(a => a.upload())).then(data => {
                console.log('업로드 완료', data);
              });
            }}
          >
            업로드
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
