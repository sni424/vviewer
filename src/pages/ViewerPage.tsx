import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import CameraPanel from '../components/CameraPanel';
import FloatingFrontView from '../components/canvas/FloatingFrontView';
import FloatingTopView from '../components/canvas/FloatingTopView';
import RendererContainer from '../components/canvas/Renderer';
import HotspotDialog from '../components/HotspotDialog';
import MaterialPanelContainer from '../components/MaterialPanel';
import MeshInfoPanel from '../components/MeshInfoPanel';
import Modal from '../components/Modal';
import ThePanel from '../components/ThePanel';
import {
  hotspotAtom,
  insideRoomAtom,
  modalAtom,
  settingsAtom,
  threeExportsAtom,
  useModal,
  viewGridAtom,
} from '../scripts/atoms';
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

const Options = () => {
  const hide = !useAtomValue(settingsAtom).detectHotspotRoom;
  const insideRoom = useAtomValue(insideRoomAtom);
  const options = useAtomValue(hotspotAtom);
  const { openModal } = useModal();

  if (hide) {
    return null;
  }

  if (!insideRoom) {
    return null;
  }

  const toShows = options.filter(option =>
    option.rooms.includes(insideRoom.index),
  );

  return (
    <ul className="absolute flex left-0 right-0 bottom-3 gap-3 items-center justify-center">
      {toShows.map((option, i) => {
        return (
          <li
            key={`bottom-option-${i}-${option.index}`}
            className="bg-white p-2 rounded-md shadow-md cursor-pointer"
            onClick={() => {
              openModal(<HotspotDialog index={option.index} />);
            }}
          >
            {option.name}
          </li>
        );
      })}
    </ul>
  );
};

const Views = () => {
  return (
    <div className="absolute bottom-2 right-2 flex flex-row gap-2 items-end ">
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
        <Options></Options>
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
