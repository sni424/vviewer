import { useAtomValue } from 'jotai';
import {
  getAtomValue,
  hotspotAtom,
  insideRoomAtom,
  settingsAtom,
  threeExportsAtom,
  useModal,
} from '../scripts/atoms';
import { THREE } from '../scripts/VTHREE';
import HotspotDialog from './HotspotDialog';

const OptionPanel = () => {
  const hide = !useAtomValue(settingsAtom).detectHotspotRoom;
  const insideRooms = useAtomValue(insideRoomAtom);
  const options = useAtomValue(hotspotAtom);
  const { openModal } = useModal();

  if (hide) {
    return null;
  }

  if (insideRooms.length === 0) {
    return null;
  }

  const toShows = options.filter(option =>
    insideRooms.some(room => option.rooms.includes(room.index)),
  );

  return (
    <ul className="absolute flex left-0 right-0 bottom-3 gap-3 items-center justify-center w-fit mx-auto">
      {toShows.map((option, i) => {
        return (
          <li
            key={`bottom-option-${i}-${option.index}`}
            className="bg-white p-2 rounded-md shadow-md cursor-pointer"
            onClick={() => {
              // openModal(<HotspotDialog index={option.index} />);
              const three = getAtomValue(threeExportsAtom);
              if (!three) {
                return;
              }

              if (!option.target) {
                return;
              }
              const mat = option.cameraMatrix;
              if (!mat) {
                return;
              }
              const matrix = new THREE.Matrix4().fromArray(mat);
              const pos = new THREE.Vector3();
              matrix.decompose(
                pos,
                new THREE.Quaternion(),
                new THREE.Vector3(),
              );

              const { camera } = three;
              camera.moveTo({
                linear: {
                  matrix: mat,
                  duration: 1.5,
                },
                onComplete: () => {
                  openModal(<HotspotDialog index={option.index} />);
                },
              });
            }}
          >
            {option.name}
          </li>
        );
      })}
    </ul>
  );
};

export default OptionPanel;
