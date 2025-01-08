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
import { loadHotspot, loadRooms, loadTourSpot } from '../scripts/atomUtils';
import { loadLatest } from '../scripts/utils';

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
    };
    loadLatest({ threeExports }).finally(() => {
      setIsLoading(false);
    });
    loadSettings();
  }, [threeExports]);

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
