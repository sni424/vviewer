import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { cameraSettingAtom, threeExportsAtom } from '../scripts/atoms';
import { THREE } from '../scripts/VTHREE';

import {
  FaAngleDoubleRight,
  FaAngleLeft,
  FaAngleRight,
  FaPause,
} from 'react-icons/fa';

type placeInfoType = {
  name: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
};

const tour: placeInfoType[] = [
  {
    name: '안방',
    position: new THREE.Vector3(3.35, 1.2, 0.686),
    direction: new THREE.Vector3(0.6, -0.05, 0.79),
  },
  {
    name: '서재방',
    position: new THREE.Vector3(-3.056, 1.2, 2.08),
    direction: new THREE.Vector3(-0.07, -0.01, 0.99),
  },
  {
    name: '아이방',
    position: new THREE.Vector3(-5.36, 1.2, 1.37),
    direction: new THREE.Vector3(-0.18, -0.06, 0.98),
  },
];

const animationSpeed = [1, 2, 3, 4, 5];

function HotSpotPanel() {
  //저장한 위치
  const [placeInfo, setPlaceInfo] = useState<placeInfoType[]>([]);

  const threeExports = useAtomValue(threeExportsAtom);
  const [cameraSetting, setCameraSetting] = useAtom(cameraSettingAtom);

  if (!threeExports) {
    return null; // early return
  }

  const { camera, scene } = threeExports;

  useEffect(() => {
    if (cameraSetting.tour.isAnimation) {
      camera.moveTo('pathfinding', {
        pathfinding: {
          target: tour[cameraSetting.tour.roomIndex].position,
          speed: cameraSetting.tour.animationSpeed,
          model: scene.children[scene.children.length - 1],
          direction: tour[cameraSetting.tour.roomIndex].direction,
        },
      });
    } else {
      camera.moveTo('pathfinding', {
        pathfinding: {
          stopAnimtaion: true,
        },
      });
    }
  }, [
    cameraSetting.tour.isAnimation,
    cameraSetting.tour.animationSpeed,
    cameraSetting.tour.roomIndex,
  ]);
  return (
    <>
      <div className="px-4 box-border w-full py-2">
        <button
          className="px-4 py-2 mt-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-transform duration-150 ease-in-out"
          onClick={() => {
            setPlaceInfo((pre: placeInfoType[]) => [
              ...pre,
              {
                name: `place-${pre.length}`,
                position: camera.position.clone(),
                direction: camera
                  .getWorldDirection(new THREE.Vector3())
                  .clone(),
              },
            ]);
          }}
        >
          위치 추가
        </button>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {placeInfo.length > 0 &&
            placeInfo.map((place: placeInfoType, index: number) => {
              return (
                <div
                  key={`placeInfo-${index}`}
                  className="relative border-2 cursor-pointer border-sky-500 bg-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-300 active:bg-gray-400 transition-all duration-150 ease-in-out p-2"
                  onClick={() => {
                    camera.moveTo('pathfinding', {
                      pathfinding: {
                        target: place.position,
                        speed: 1,
                        model: scene.children[scene.children.length - 1],
                        direction: place.direction,
                      },
                    });
                  }}
                >
                  x
                  <div
                    id={place.name}
                    className="absolute bottom-4 right-1 text-sm text-gray-500 hover:text-red-600 cursor-pointer"
                    onClick={e => {
                      e.stopPropagation();
                      setPlaceInfo(prev => prev.filter((_, i) => i !== index));
                    }}
                  >
                    &times;
                  </div>
                  {place.name}
                </div>
              );
            })}
        </div>
      </div>
      <div className="px-2">
        <div className=" flex items-center justify-between w-full p-2 rounded-full bg-gray-800 shadow-lg text-white">
          {/* 이전 버튼 */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700"
            onClick={() => {
              setCameraSetting(pre => ({
                ...pre,
                tour: {
                  ...pre.tour,
                  roomIndex:
                    pre.tour.roomIndex < 1
                      ? tour.length - 1
                      : pre.tour.roomIndex - 1,
                },
              }));
            }}
          >
            <span className="text-xl text-black hover:text-white leading-none flex items-center justify-center">
              <FaAngleLeft />
            </span>
          </button>
          {/* 중간 부분 */}
          <div className="flex items-center gap-4">
            {/* 실행행 버튼 */}
            <div
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 cursor-pointer"
              onClick={() => {
                setCameraSetting(pre => ({
                  ...pre,
                  tour: {
                    ...pre.tour,
                    isAnimation: !pre.tour.isAnimation,
                  },
                }));
              }}
            >
              {cameraSetting.tour.isAnimation ? (
                <FaPause className="text-xl" />
              ) : (
                <FaAngleDoubleRight className="text-xl" />
              )}
            </div>

            {/* 페이지 수 */}
            <div className="px-3 py-1 bg-blue-600 rounded-lg">
              {cameraSetting?.tour?.roomIndex + 1} / {tour.length}
            </div>

            {/* 배속 */}
            <select
              className="text-sm font-semibold text-black"
              value={cameraSetting?.tour?.animationSpeed}
              onChange={e => {
                setCameraSetting(pre => ({
                  ...pre,
                  tour: {
                    ...pre.tour,
                    animationSpeed: Number(e.target.value),
                  },
                }));
              }}
            >
              {animationSpeed.map((speed, index) => (
                <option key={`animationSpeed_${index}`} value={index + 1}>
                  x{speed}
                </option>
              ))}
            </select>

            {/* 드롭다운 */}
            <select
              className="p-1 text-black rounded-md"
              value={cameraSetting?.tour?.roomIndex}
              onChange={e => {
                setCameraSetting(pre => ({
                  ...pre,
                  tour: {
                    ...pre.tour,
                    roomIndex: Number(e.target.value),
                  },
                }));
              }}
            >
              {tour.map((room, index) => (
                <option key={`tour_${index}`} value={index}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          {/* 다음 버튼 */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700"
            onClick={() => {
              setCameraSetting(pre => ({
                ...pre,
                tour: {
                  ...pre.tour,
                  roomIndex:
                    pre.tour.roomIndex + 1 === tour.length
                      ? 0
                      : pre.tour.roomIndex + 1,
                },
              }));
            }}
          >
            <span className="text-2xl text-black hover:text-white leading-none flex items-center justify-center">
              <FaAngleRight />
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

export default HotSpotPanel;
