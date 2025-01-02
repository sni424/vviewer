import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import {
  FaAngleDoubleRight,
  FaAngleLeft,
  FaAngleRight,
  FaPause,
} from 'react-icons/fa';

import {
  cameraActionAtom,
  cameraSettingAtom,
  threeExportsAtom,
} from '../scripts/atoms';
import { THREE } from '../scripts/VTHREE';

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
  {
    name: '주방',
    position: new THREE.Vector3(1.087, 1.258, -3.426),
    direction: new THREE.Vector3(0.93, 0.03, -0.26),
  },
  {
    name: '거실',
    position: new THREE.Vector3(1.62, 1.2, 1.08),
    direction: new THREE.Vector3(-0.68, 0.1, 0.72),
  },
  {
    name: '화장실',
    position: new THREE.Vector3(-5.9, 1.2, 0.33),
    direction: new THREE.Vector3(-0.99, -0.9, 0.06),
  },
];

const animationSpeed = [1, 2, 3, 4, 5];

function HotSpotPanel() {
  // 핫스팟 정보
  const [placeInfo, setPlaceInfo] = useState<placeInfoType[]>([]);
  // 순간이동 정보보
  const [telePort, setTelePort] = useState<placeInfoType[]>([]);
  // 투어 실행 여부
  const [isTour, setTour] = useState<boolean>(false);
  //threejs useThree
  const threeExports = useAtomValue(threeExportsAtom);
  //카메라 액션
  const [cameraAction, setCameraAction] = useAtom(cameraActionAtom);
  //카메라 세팅팅
  const cameraSetting = useAtomValue(cameraSettingAtom);

  if (!threeExports) return null;

  const { camera, scene } = threeExports;

  // 투어 애니메이션 실행 함수
  const executeTour = (roomIndex: number) => {
    const { position, direction } = tour[roomIndex];
    camera.moveTo('pathfinding', {
      pathfinding: {
        target: new THREE.Vector3(position.x, position.y, position.z),
        speed: cameraAction.tour.animationSpeed,
        model: scene,
        direction,
      },
    });
    setCameraAction(pre => ({
      ...pre,
      tour: {
        ...pre.tour,
        isAnimation: true,
      },
    }));
  };

  // 이전전 방으로 이동
  const moveToPrevRoom = () => {
    setCameraAction(pre => ({
      ...pre,
      tour: {
        ...pre.tour,
        roomIndex:
          pre.tour.roomIndex - 1 === 0
            ? tour.length - 1
            : pre.tour.roomIndex - 1,
        isAnimation: true,
      },
    }));
  };

  // 다음 방으로 이동
  const moveToNextRoom = () => {
    setCameraAction(pre => ({
      ...pre,
      tour: {
        ...pre.tour,
        roomIndex:
          pre.tour.roomIndex + 1 === tour.length ? 0 : pre.tour.roomIndex + 1,
        isAnimation: true,
      },
    }));
  };
  //투어하는 방 선택한 방으로로 변경
  const changeTourRoom = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCameraAction(pre => ({
      ...pre,
      tour: {
        ...pre.tour,
        roomIndex: Number(e.target.value),
      },
    }));
  };

  //투어 속도 조절
  const changeTourSpeed = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCameraAction(pre => ({
      ...pre,
      tour: {
        ...pre.tour,
        animationSpeed: Number(e.target.value),
      },
    }));
  };

  // 핫스팟 추가
  const addHotSpot = () => {
    setPlaceInfo(prev => [
      ...prev,
      {
        name: `place-${prev.length}`,
        position: camera.position.clone(),
        direction: camera.getWorldDirection(new THREE.Vector3()).clone(),
      },
    ]);
  };

  //핫스팟 이동
  const moveHotSpot = (place: placeInfoType) => {
    camera.moveTo('linear', {
      linear: {
        target: place.position,
        direction: place.direction,
        duration: cameraSetting.moveSpeed,
      },
    });
  };

  // 핫스팟 삭제
  const deleteHotSpot = (index: number) => {
    setPlaceInfo(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (isTour) {
      executeTour(cameraAction.tour.roomIndex);
    } else {
      camera.moveTo('pathfinding', {
        pathfinding: {
          stopAnimtaion: true,
        },
      });
      setCameraAction(pre => ({
        ...pre,
        tour: {
          ...pre.tour,
          isAnimation: false,
        },
      }));
    }
  }, [isTour]);

  // 텔레포트트 추가
  const addTelePort = () => {
    setTelePort(prev => [
      ...prev,
      {
        name: `place-${prev.length}`,
        position: camera.position.clone(),
        direction: camera.getWorldDirection(new THREE.Vector3()).clone(),
      },
    ]);
  };

  //텔레포트트 이동
  const moveTelePort = (place: placeInfoType) => {
    camera.moveTo('teleport', {
      teleport: {
        target: place.position,
        direction: place.direction,
      },
    });
  };

  // 텔레포트 삭제
  const deleteTelePort = (index: number) => {
    setTelePort(prev => prev.filter((_, i) => i !== index));
  };

  // 투어 애니메이션 실행
  useEffect(() => {
    if (cameraAction.tour.isAnimation && isTour) {
      executeTour(cameraAction.tour.roomIndex);
    }
  }, [cameraAction.tour.roomIndex]);

  // 투어 경로 종료 시 다음 방으로 이동
  useEffect(() => {
    if (!cameraAction.tour.isAnimation && isTour) {
      moveToNextRoom();
    }
  }, [cameraAction.tour.isAnimation]);

  return (
    <>
      <div className="px-4 box-border w-full py-2">
        <button
          className="px-4 py-2 mt-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-transform duration-150 ease-in-out"
          onClick={addHotSpot}
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
                    moveHotSpot(place);
                  }}
                >
                  x
                  <div
                    id={place.name}
                    className="absolute bottom-4 right-1 text-sm text-gray-500 hover:text-red-600 cursor-pointer"
                    onClick={e => {
                      // 해당 핫스팟 삭제제
                      e.stopPropagation();
                      deleteHotSpot(index);
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
              //이전 방으로 변경경
              moveToPrevRoom();
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
              className="w-8 h-8 flex items-center justify-center 
            rounded-full hover:bg-gray-700 cursor-pointer text-xl"
              onClick={() => setTour(!isTour)}
            >
              {isTour ? <FaPause /> : <FaAngleDoubleRight />}
            </div>

            {/* 페이지 수 */}
            <div className="px-3 py-1 bg-blue-600 rounded-lg">
              {cameraAction?.tour?.roomIndex + 1} / {tour.length}
            </div>

            {/* 배속 */}
            <select
              className="text-sm font-semibold text-black"
              value={cameraAction?.tour?.animationSpeed}
              onChange={e => {
                //투어 속도 조절절
                changeTourSpeed(e);
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
              value={cameraAction?.tour?.roomIndex}
              onChange={e => {
                //투어하는 방 변경
                changeTourRoom(e);
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
              //다음 방으로 변경
              moveToNextRoom();
            }}
          >
            <span className="text-2xl text-black hover:text-white leading-none flex items-center justify-center">
              <FaAngleRight />
            </span>
          </button>
        </div>
      </div>
      <div className="px-4 box-border w-full py-2">
        <button
          className="px-4 py-2 mt-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-transform duration-150 ease-in-out"
          onClick={addTelePort}
        >
          순간이동 위치 추가
        </button>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {telePort.length > 0 &&
            telePort.map((place: placeInfoType, index: number) => {
              return (
                <div
                  key={`placeInfo-${index}`}
                  className="relative border-2 cursor-pointer border-sky-500 bg-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-300 active:bg-gray-400 transition-all duration-150 ease-in-out p-2"
                  onClick={() => {
                    moveTelePort(place);
                  }}
                >
                  x
                  <div
                    id={place.name}
                    className="absolute bottom-4 right-1 text-sm text-gray-500 hover:text-red-600 cursor-pointer"
                    onClick={e => {
                      // 해당 핫스팟 삭제제
                      e.stopPropagation();
                      deleteTelePort(index);
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
    </>
  );
}

export default HotSpotPanel;
