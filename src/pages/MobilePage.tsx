import MobileRenderer from '../components/mobile/MobileRenderer';
import MobileBenchmarkPanel from '../components/mobile/MobileBenchmarkPanel';
import MobileControlPanel from '../components/mobile/MobileControlPanel';
import MobileLoaderPanel from '../components/mobile/MobileLoaderPanel';

function MobilePage() {
  return (
    <div
      style={{
        width: '100dvw',
        height: '100dvh',
      }}
    >
      <MobileRenderer></MobileRenderer>
      <MobileBenchmarkPanel></MobileBenchmarkPanel>
      <MobileControlPanel></MobileControlPanel>
      <MobileLoaderPanel></MobileLoaderPanel>
    </div>
  );
}

export default MobilePage;
