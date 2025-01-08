import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import CameraPanel from '../components/CameraPanel';
import FloatingFrontView from '../components/canvas/FloatingFrontView';
import FloatingTopView from '../components/canvas/FloatingTopView';
import RendererContainer from '../components/canvas/Renderer';
import MaterialPanelContainer from '../components/MaterialPanel';
import MeshInfoPanel from '../components/MeshInfoPanel';
import Modal from '../components/Modal';
import OptionPanel from '../components/OptionPanel';
import ThePanel from '../components/ThePanel';
import {
  DPAtom,
  modalAtom,
  threeExportsAtom,
  viewGridAtom,
} from '../scripts/atoms';
import { loadNavMesh } from '../scripts/atomUtils';
import useFiles from '../scripts/useFiles';
import useModelDragAndDrop from '../scripts/useModelDragAndDrop';
import { getSettings, loadSettings } from './useSettings';

function Loading() {
  const files = useFiles();
  const { loadingFiles } = files;
  const hasLoading = loadingFiles.length > 0;

  return (
    <>
      {hasLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              padding: 16,
              borderRadius: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 'bold',
              }}
            >
              Loading {loadingFiles.length} files...
            </div>
            <div
              style={{
                marginTop: 16,
              }}
            >
              {loadingFiles.map(({ name }, index) => (
                <div key={index}>{name}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const MyModal = ({ closeModal }: { closeModal?: () => any }) => {
  return (
    <div
      style={{ backgroundColor: 'white', padding: 16, borderRadius: 8 }}
      onClick={e => {
        e.stopPropagation();
      }}
    >
      asdf{' '}
      <button
        onClick={e => {
          e.stopPropagation();
          closeModal?.();
        }}
      >
        close
      </button>
    </div>
  );
};

const ControlPanel = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const setModal = useSetAtom(modalAtom);

  if (!threeExports) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        padding: 4,
        borderRadius: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
      }}
    >
      <button
        onClick={() => {
          console.log('getsettings:', getSettings());
          loadSettings().then(s => {
            // console.log('Loaded:', s);
          });
        }}
      >
        세팅
      </button>
    </div>
  );
};

const DPToggle = () => {
  const [dp, setDP] = useAtom(DPAtom);
  useEffect(() => {
    const objects = dp.objects;
    console.log(objects);
    objects.map(o => {
      o.visible = dp.on;
    });
  }, [dp.on]);

  return (
    <button
      onClick={() => {
        setDP(prev => {
          return { ...prev, on: !prev.on };
        });
      }}
    >
      {dp.on ? 'DP ON' : 'DP OFF'}
    </button>
  );
};

const ViewGrid = () => {
  const [view, setView] = useAtom(viewGridAtom);
  return (
    <button
      onClick={() => {
        setView(prev => !prev);
      }}
    >
      {view ? '그리드 끄기' : '그리드 켜기'}
    </button>
  );
};

const LoadFloor = () => {
  return <button onClick={loadNavMesh}>바닥 로드</button>;
};

const Views = () => {
  return (
    <div className="absolute bottom-2 right-2 flex flex-row gap-2 items-end ">
      <LoadFloor></LoadFloor>
      <DPToggle></DPToggle>
      <ViewGrid></ViewGrid>
      <FloatingTopView></FloatingTopView>
      <FloatingFrontView></FloatingFrontView>
      {/*<GizmoPanel></GizmoPanel>*/}
    </div>
  );
};

const ViewerPage = () => {
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } =
    useModelDragAndDrop();

  return (
    <div
      className="fullscreen flex relative text-xs"
      style={{
        cursor: isDragging ? 'copy' : 'auto',
      }}
    >
      <div
        className="fillwidth h-full relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <RendererContainer />
        <Views></Views>
        <CameraPanel />
        <OptionPanel></OptionPanel>
      </div>
      <div className="relative h-full w-1/4 max-w-[400px] min-w-[240px]">
        <ThePanel />
      </div>
      <MaterialPanelContainer></MaterialPanelContainer>
      <MeshInfoPanel></MeshInfoPanel>
      {/* <ControlPanel></ControlPanel> */}
      <Modal></Modal>
      <Loading />
    </div>
  );
};

export default ViewerPage;
