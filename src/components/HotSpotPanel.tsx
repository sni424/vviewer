import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import {
  cameraActionAtom,
  cameraSettingAtom,
  threeExportsAtom,
} from '../scripts/atoms';
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
  //카메라 액션 atom
  const [cameraAction, setCameraAction] = useAtom(cameraActionAtom);
  //카메라 설정값값
  const cameraSetting = useAtomValue(cameraSettingAtom);
  //바닥모델델
  const [floorModel, setFloorModel] = useState<THREE.Mesh>();
  if (!threeExports) {
    return null; // early return
  }

  const { camera, scene } = threeExports;

  useEffect(() => {
    //투어 시작
    if (cameraAction.tour.isAnimation) {
      // 자동투어 시작
      setCameraAction(pre => ({
        ...pre,
        tour: {
          ...pre.tour,
          path: true,
        },
      }));

      //투어에 따른 카메라 이동
      camera.moveTo('pathfinding', {
        pathfinding: {
          target: tour[cameraAction.tour.roomIndex].position,
          speed: cameraAction.tour.animationSpeed,
          model: floorModel,
          direction: tour[cameraAction.tour.roomIndex].direction,
        },
      });
    }
    //투어 종료
    else {
      camera.moveTo('pathfinding', {
        pathfinding: {
          stopAnimtaion: true,
        },
      });
    }
  }, [
    cameraAction.tour.isAnimation,
    cameraAction.tour.animationSpeed,
    cameraAction.tour.roomIndex,
  ]);

  useEffect(() => {
    //투어에서 방에관한 경로가 끝나면 다음 방으로 변경
    if (!cameraAction.tour.path) {
      setCameraAction(pre => ({
        ...pre,
        tour: {
          ...pre.tour,
          roomIndex:
            pre.tour.roomIndex + 1 === tour.length ? 0 : pre.tour.roomIndex + 1,
        },
      }));
    }
  }, [cameraAction.tour.path]);
  return (
    <>
      <div className="px-4 box-border w-full py-2">
        <button
          className="px-4 py-2 mt-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-transform duration-150 ease-in-out"
          onClick={() => {
            //해당 위치로 핫스팟 추가가
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
                    //핫스팟으로 이동
                    camera.moveTo('linear', {
                      linear: {
                        target: place.position,
                        direction: place.direction,
                        duration: cameraSetting.moveSpeed,
                      },
                    });
                  }}
                >
                  x
                  <div
                    id={place.name}
                    className="absolute bottom-4 right-1 text-sm text-gray-500 hover:text-red-600 cursor-pointer"
                    onClick={e => {
                      // 해당 핫스팟 삭제제
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
              //이전 방으로 변경경
              setCameraAction(pre => ({
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
                //투어 실행
                //바닥 모델 찾기기
                const navMesh = scene.getObjectByName('84B3_DP') as THREE.Mesh;
                setFloorModel(navMesh);
                //애니메이션 실행행
                setCameraAction(pre => ({
                  ...pre,
                  tour: {
                    ...pre.tour,
                    isAnimation: !pre.tour.isAnimation,
                  },
                }));
              }}
            >
              {cameraAction.tour.isAnimation ? (
                <FaPause className="text-xl" />
              ) : (
                <FaAngleDoubleRight className="text-xl" />
              )}
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
                setCameraAction(pre => ({
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
              value={cameraAction?.tour?.roomIndex}
              onChange={e => {
                //투어하는 방 변경
                setCameraAction(pre => ({
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
              //다음 방으로 변경
              setCameraAction(pre => ({
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
