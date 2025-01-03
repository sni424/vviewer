import CameraPanel from '../components/CameraPanel';
import MobileBenchmarkPanel from '../components/mobile/MobileBenchmarkPanel';
import MobileCameraManager from '../components/mobile/MobileCameraManager';
import MobileControlPanel from '../components/mobile/MobileControlPanel';
import MobileLoaderPanel from '../components/mobile/MobileLoaderPanel';
import MobileRenderer from '../components/mobile/MobileRenderer';

function MobilePage() {
  return (
    <div className="relative w-dvw h-dvh text-xs">
      <MobileRenderer></MobileRenderer>
      <MobileBenchmarkPanel></MobileBenchmarkPanel>
      <CameraPanel></CameraPanel>
      <MobileControlPanel></MobileControlPanel>
      <MobileLoaderPanel></MobileLoaderPanel>
      <MobileCameraManager></MobileCameraManager>
    </div>
  );
}

export default MobilePage;
