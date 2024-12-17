import { useAtomValue, useSetAtom } from 'jotai';
import CameraPanel from '../components/CameraPanel';
import FloatingFrontView from '../components/canvas/FloatingFrontView';
import FloatingTopView from '../components/canvas/FloatingTopView';
import RendererContainer from '../components/canvas/Renderer';
import GizmoPanel from '../components/GizmoPanel';
import MaterialPanelContainer from '../components/MaterialPanel';
import MeshInfoPanel from '../components/MeshInfoPanel';
import Modal from '../components/Modal';
import ThePanel from '../components/ThePanel';
import { loadHistoryAtom, modalAtom, threeExportsAtom } from '../scripts/atoms';
import useFiles from '../scripts/useFiles';
import useModelDragAndDrop from '../scripts/useModelDragAndDrop';

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
  const setLoadHistoryAtom = useSetAtom(loadHistoryAtom);
  // const { openModal } = useModal();
  const setModal = useSetAtom(modalAtom);

  if (!threeExports) {
    return null;
  }

  // return null;

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
          setModal(MyModal);
        }}
      >
        Modal
      </button>

      {/* <button onClick={() => {
      //@ts-ignore
      threeExports.scene.children.forEach(child => {
        //@ts-ignore
        threeExports.scene.remove(child);
      })

      setLoadHistoryAtom(new Map());
    }}>Reset</button> */}
    </div>
  );
};

const Views = () => {
  return (
    <div className="absolute bottom-2 right-2 flex flex-row gap-2 items-end ">
      <FloatingTopView></FloatingTopView>
      <FloatingFrontView></FloatingFrontView>
      <GizmoPanel></GizmoPanel>
    </div>
  );
};

const ViewerPage = () => {
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } =
    useModelDragAndDrop();

  return (
    <div
      className="fullscreen flex relative"
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
      </div>
      <div className="relative h-full w-1/4 max-w-[400px] min-w-[240px]">
        <ThePanel />
      </div>
      {/* <ControlPanel></ControlPanel> */}
      <MaterialPanelContainer></MaterialPanelContainer>
      <MeshInfoPanel></MeshInfoPanel>
      <Modal></Modal>
      <Loading />
    </div>
  );
};

export default ViewerPage;
