import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { THREE } from 'VTHREE';
import MobileBenchmarkPanel from '../components/mobile/MobileBenchmarkPanel';
import MobileCameraManager from '../components/mobile/MobileCameraManager';
import MobileRenderer from '../components/mobile/MobileRenderer';
import MobileSimplePanel from '../components/MobileSimplePanel.tsx';
import Modal from '../components/Modal';
import OptionPanel from '../components/OptionPanel.tsx';
import {
  DPAtom,
  hotspotAtom,
  roomAtom,
  setAtomValue,
  threeExportsAtom,
  tourAtom,
} from '../scripts/atoms';
import {
  loadHotspot,
  loadPostProcessAndSet,
  loadProbes,
  loadRooms,
  loadTourSpot,
} from '../scripts/atomUtils';
import VGLTFLoader from '../scripts/loaders/VGLTFLoader.ts';
import ReflectionProbe, {
  ReflectionProbeJSON,
} from '../scripts/ReflectionProbe.ts';
import { loadLatest } from '../scripts/utils';

const createGeometry = (points: [number, number][]) => {
  if (points.length < 3) {
    throw new Error('At least 3 points are required to create a geometry');
  }

  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(point => {
    shape.lineTo(point[0], point[1]);
  });
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(Math.PI / 2);

  return geometry;
};

const useLoad = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [dp, setDp] = useAtom(DPAtom);

  useEffect(() => {
    if (!threeExports) {
      return;
    }

    const { scene, camera, gl } = threeExports;

    const loadSettings = async () => {
      loadHotspot().then(res => {
        if (res) {
          setAtomValue(hotspotAtom, res);
        } else {
          console.error('Failed to load hotspots', res);
        }
      });
      loadRooms().then(res => {
        if (res) {
          setAtomValue(roomAtom, res);
        } else {
          console.error('Failed to load rooms', res);
        }
      });
      loadTourSpot().then(res => {
        if (res) {
          setAtomValue(tourAtom, res);
        } else {
          console.error('Failed to load tour spots', res);
        }
      });
      // loadNavMesh().then(res=>{

      // })
      loadPostProcessAndSet();
    };
    loadLatest({ threeExports }).finally(() => {
      loadProbes().then(async probes => {
        if (!ReflectionProbe.isProbeJson(probes)) {
          alert('프로브 불러오기 실패!');
          console.warn(
            'probe.json FromJSON 을 할 수 없음 => ReflectionProbe.isProbeJson === false',
          );
        } else {
          const probeJsons = probes as ReflectionProbeJSON[];
          const filtered = probeJsons.filter(
            probeJson => probeJson.useCustomTexture,
          );
          const ktx2Loader = VGLTFLoader.ktx2Loader;
          const pmremGenerator = new THREE.PMREMGenerator(gl);
          pmremGenerator.compileEquirectangularShader();
          pmremGenerator.compileCubemapShader();
          const probeList = await Promise.all(
            filtered.map(async json => {
              const textureUrls = json.textureUrls;

              const order = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

              const sortedTextures = textureUrls!.sort((a, b) => {
                const getKey = (str: string) =>
                  str.match(/_(px|nx|py|ny|pz|nz)\.ktx$/)![1];
                return order.indexOf(getKey(a)) - order.indexOf(getKey(b));
              });

              const loads = await Promise.all(
                sortedTextures.map(
                  async url => await ktx2Loader.loadAsync(url),
                ),
              );

              loads.forEach(load => {
                load.flipY = false;
                load.needsUpdate = true;
              });

              const cubeTexture = new THREE.CubeTexture(loads);
              cubeTexture.mapping = THREE.CubeReflectionMapping;
              cubeTexture.format = loads[0].format;
              cubeTexture.generateMipmaps = false;
              cubeTexture.minFilter = THREE.LinearFilter;
              cubeTexture.needsUpdate = true;
              const pmremTexture =
                pmremGenerator.fromCubemap(cubeTexture).texture;
              cubeTexture.dispose();
              pmremTexture.rotation = Math.PI;
              return {
                texture: pmremTexture,
                id: json.id,
                center: new THREE.Vector3().fromArray(json.center),
                size: new THREE.Vector3().fromArray(json.size),
              };
            }),
          );

          ktx2Loader.dispose();
          pmremGenerator.dispose();

          probeList.forEach(TnI => {
            const texture = TnI.texture;
            scene.traverse(node => {
              if (node instanceof THREE.Mesh) {
                const n = node as THREE.Mesh;
                const material = n.material as THREE.MeshStandardMaterial;
                if (material.vUserData.probeId === TnI.id) {
                  material.envMap = texture;
                  material.onBeforeCompile =
                    ReflectionProbe.envProjectionFunction(
                      TnI.center,
                      TnI.size,
                      true,
                    );
                  material.needsUpdate = true;
                }
              }
            });
          });

          probeList.forEach(TnI => {
            const texture = TnI.texture;
            texture.dispose();
          });
        }
      });
      setIsLoading(false);
    });
    loadSettings();
  }, [threeExports]);

  useEffect(() => {
    return;
  }, [isLoading]);

  return isLoading;
};

const Loading = () => {
  return (
    <div className="absolute left-0 right-0 top-0 bottom-0 bg-slate-800 bg-opacity-25 flex justify-center items-center">
      <div className="text-white font-bold text-lg">Loading...</div>
    </div>
  );
};

function MobilePage() {
  const isLoading = useLoad();

  return (
    <div className="relative w-dvw h-dvh text-xs">
      <MobileRenderer></MobileRenderer>
      <MobileBenchmarkPanel></MobileBenchmarkPanel>
      {/*<CameraPanel></CameraPanel>*/}
      <MobileSimplePanel></MobileSimplePanel>
      {/*<MobileControlPanel></MobileControlPanel>*/}
      {/* <MobileLoaderPanel></MobileLoaderPanel> */}
      <MobileCameraManager></MobileCameraManager>
      <OptionPanel></OptionPanel>
      <Modal></Modal>
      {isLoading && <Loading></Loading>}
    </div>
  );
}

export default MobilePage;
