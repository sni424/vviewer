import { useEffect, useRef, useState } from 'react';
import ObjectViewer from 'src/components/ObjectViewer';
import Asset, { LocalAssetType, VRemoteAsset } from 'src/scripts/manager/Asset';
import { THREE } from 'VTHREE';

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
  const [asset, setAsset] = useState<LocalAssetType>();

  useEffectOnce(() => {
    new Asset(mesh2Asset).get();
    new Asset(meshAsset).get<THREE.Mesh>().then(mesh => {
      setAsset(mesh);
    });
  });

  return (
    <div className="fullscreen">
      {/* <TestSceneChange /> */}
      <ObjectViewer data={asset}></ObjectViewer>
    </div>
  );
}

export default TestPage;
