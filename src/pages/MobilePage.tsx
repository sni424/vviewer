import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import CameraPanel from '../components/CameraPanel';
import MobileBenchmarkPanel from '../components/mobile/MobileBenchmarkPanel';
import MobileCameraManager from '../components/mobile/MobileCameraManager';
import MobileRenderer from '../components/mobile/MobileRenderer';
import Modal from '../components/Modal';
import OptionPanel from '../components/OptionPanel';
import {
  hotspotAtom,
  roomAtom,
  setAtomValue,
  threeExportsAtom,
  tourAtom,
} from '../scripts/atoms';
import {
  loadHotspot,
  loadPostProcessAndSet,
  loadRooms,
  loadTourSpot,
} from '../scripts/atomUtils';
import { loadLatest } from '../scripts/utils';
import { THREE } from '../scripts/VTHREE';

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

  useEffect(() => {
    if (!threeExports) {
      return;
    }

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
      <CameraPanel></CameraPanel>
      {/* <MobileControlPanel></MobileControlPanel> */}
      {/* <MobileLoaderPanel></MobileLoaderPanel> */}
      <MobileCameraManager></MobileCameraManager>
      <OptionPanel></OptionPanel>
      <Modal></Modal>
      {isLoading && <Loading></Loading>}
    </div>
  );
}

export default MobilePage;
