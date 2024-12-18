import MobileBenchmarkPanel from '../components/mobile/MobileBenchmarkPanel';
import MobileControlPanel from '../components/mobile/MobileControlPanel';
import MobileLoaderPanel from '../components/mobile/MobileLoaderPanel';
import MobileRenderer from '../components/mobile/MobileRenderer';

function MobilePage() {
  return (
    <div className="w-dvw h-dvh text-xs">
      <MobileRenderer></MobileRenderer>
      <MobileBenchmarkPanel></MobileBenchmarkPanel>
      <MobileControlPanel></MobileControlPanel>
      <MobileLoaderPanel></MobileLoaderPanel>
    </div>
  );
}

export default MobilePage;
