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
  getAtomValue,
  setAtomValue,
  threeExportsAtom,
  tourAtom,
} from '../scripts/atoms';
import { loadTourSpot, uploadJson } from '../scripts/atomUtils';

type placeInfoType = {
  name: string;
  matrix: number[];
};

type telePortType = {
  name: string;
  matrix: number[];
};

const animationSpeed = [1, 2, 3, 4, 5];

const uploadTourSpot = async () => {
  const tourSpots = getAtomValue(tourAtom);

  uploadJson('tourSpot.json', tourSpots)
    .then(res => res.json())
    .then(res => {
      if (res?.success === true) {
        alert('업로드 완료');
      } else {
        throw res;
      }
    })
    .catch(err => {
      console.error(err);
      alert('업로드 실패');
    });
};

function HotSpotPanel() {
  // 핫스팟 정보
  const [placeInfo, setPlaceInfo] = useState<placeInfoType[]>([]);
  // 순간이동 정보보
  const [telePort, setTelePort] = useState<telePortType[]>([]);
  //방 이름
  const [placeName, setPlaceName] = useState<string>('');
  //투어 방 정보
  const [tourPlace, setTourPlace] = useAtom(tourAtom);

  const [isTourInput, setTourInput] = useState<boolean>(false);
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
  // 투어 추가 함수수
  const addTour = () => {
    if (placeName.length > 0) {
      setTourPlace(pre => [
        ...pre,
        { name: placeName, matrix: camera.matrix.toArray() },
      ]);
      setPlaceName('');
      setTourInput(false);
    } else {
      window.alert('이름을 입력해주세요.');
    }
  };

  // 투어 애니메이션 실행 함수
  const executeTour = (roomIndex: number) => {
    if (tourPlace.length > 0) {
      const { matrix } = tourPlace[roomIndex];
      camera.moveTo({
        pathFinding: {
          speed: cameraAction.tour.animationSpeed,
          model: scene,
          isTour: true,
          matrix,
        },
      });
      setCameraAction(pre => ({
        ...pre,
        tour: {
          ...pre.tour,
          isAnimation: true,
        },
      }));
    }
  };

  // 이전전 방으로 이동
  const moveToPrevRoom = () => {
    setCameraAction(pre => ({
      ...pre,
      tour: {
        ...pre.tour,
        roomIndex:
          pre.tour.roomIndex - 1 === 0
            ? tourPlace.length - 1
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
          pre.tour.roomIndex + 1 === tourPlace.length
            ? 0
            : pre.tour.roomIndex + 1,
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
        matrix: camera.matrix.toArray(),
      },
    ]);
  };

  //핫스팟 이동
  const moveHotSpot = (place: placeInfoType) => {
    camera.moveTo({
      linear: {
        matrix: place.matrix,
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
      camera.moveTo({
        pathFinding: {
          stopAnimation: true,
          isTour: true,
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
        matrix: camera.matrix.toArray(),
      },
    ]);
  };

  //텔레포트트 이동
  const moveTelePort = (place: telePortType) => {
    camera.moveTo({
      teleport: {
        matrix: place.matrix,
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
          핫스팟 테스트 위치 추가
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
      <div className="px-4 box-border w-full py-2">
        <button
          className="px-4 py-2 mt-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-transform duration-150 ease-in-out"
          onClick={() => {
            setTourInput(true);
          }}
        >
          현재 위치 투어에 추가
        </button>
      </div>
      {isTourInput && (
        <div className="px-4 box-border w-full pb-2">
          <input
            className="py-2 px-2"
            placeholder="방 이름"
            value={placeName}
            onChange={e => {
              setPlaceName(e.target.value);
            }}
          />
          <button
            className="px-4 py-2 mt-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-transform duration-150 ease-in-out"
            onClick={addTour}
          >
            추가
          </button>
        </div>
      )}

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
              {cameraAction?.tour?.roomIndex + 1} / {tourPlace.length}
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
              {tourPlace.map((room, index) => (
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
            telePort.map((place: telePortType, index: number) => {
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
      <div className="px-4 box-border w-full flex items-center gap-2">
        <button
          className="px-4 py-2 mt-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-transform duration-150 ease-in-out"
          onClick={() => setTourPlace([])}
        >
          투어 정보 전부 삭제
        </button>
        <button
          className="px-4 py-2 mt-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-transform duration-150 ease-in-out"
          onClick={() => uploadTourSpot()}
        >
          업로드
        </button>
        <button
          className="px-4 py-2 mt-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition-transform duration-150 ease-in-out"
          onClick={() => {
            loadTourSpot()
              .then(tourSpot => {
                if (tourSpot) {
                  setAtomValue(tourAtom, tourSpot);
                  alert('투어정보 로드완료');
                } else {
                  throw tourSpot;
                }
              })
              .catch(err => {
                console.error(err);
                alert('투어정보 로드실패');
              });
          }}
        >
          불러오기
        </button>
      </div>
    </>
  );
}

export default HotSpotPanel;
