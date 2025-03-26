import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { roomColorString } from '../Constants';
import {
  getAtomValue,
  Room,
  roomAtom,
  RoomCreateOption,
  threeExportsAtom,
} from '../scripts/atoms';
import { loadRooms, uploadJson } from '../scripts/atomUtils';
import { THREE } from '../scripts/vthree/VTHREE';

const uploadRooms = async () => {
  const hotspots = getAtomValue(roomAtom);

  uploadJson('rooms.json', hotspots)
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

function RoomSetting() {
  const [rooms, setRooms] = useAtom(roomAtom);
  const [newRooms, setNewRooms] = useState<RoomCreateOption[]>([]);
  // 각 방 이름의 로컬 상태를 관리할 객체
  const [localNames, setLocalNames] = useState<{ [key: number]: string }>({});
  const createRoom = () => {
    setRooms(prev => {
      return [
        ...prev,
        {
          name: '방',
          border: [],
          show: true,
          tourMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          index: prev.length + 1,
        },
      ];
    });
  };

  // 입력 핸들러 수정
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const value = e.target.value;
    // 로컬 상태 업데이트
    setLocalNames(prev => ({
      ...prev,
      [index]: value,
    }));
  };

  // 포커스를 잃을 때 최종 값으로 방 이름 업데이트
  const handleInputBlur = (index: number, roomIndex: number) => {
    if (localNames[index] !== undefined) {
      setRooms(prev => {
        const newRooms = [...prev];
        newRooms[index] = {
          ...newRooms[index],
          name: localNames[index],
        };
        return newRooms;
      });
    }
  };
  const creatingRoom = rooms.find(room => Boolean(room.creating));

  const ondDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    childData: Room,
  ) => {
    e.stopPropagation();

    e.dataTransfer.setData('text/plain', String(childData.index));
  };

  const onDragOverFun = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const target = e.target as HTMLElement;
    // const area = e.nativeEvent.offsetY / target.clientHeight;

    // if (target.id !== '') {
    //   if (area < 0.25) {
    //     console.log('탑');
    //   } else if (area > 0.75) {
    //     console.log('바텀');
    //   } else {
    //     console.log('드래그');
    //   }
    // }
  };

  const onDragDropFun = (
    e: React.DragEvent<HTMLDivElement>,
    childData: Room,
  ) => {
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;

    const area = e.nativeEvent.offsetY / target.clientHeight;
    const draggedId = Number(e.dataTransfer.getData('text/plain'));
    console.log('childData', childData.index, draggedId);

    if (draggedId === childData.index) {
      return;
    }

    const dropRooms = [...newRooms];

    const copyIndex = dropRooms[childData.index - 1].index;
    dropRooms[childData.index - 1].index = draggedId;
    dropRooms[draggedId - 1].index = copyIndex;
    dropRooms.sort((l, r) => {
      return l.index - r.index;
    });
    setRooms(dropRooms);
  };

  useEffect(() => {
    if (rooms.length > 0) {
      const sorted = [...rooms];
      sorted.sort((l, r) => {
        return l.index - r.index;
      });
      setNewRooms(sorted);
    } else {
      setNewRooms([]);
    }
  }, [rooms]);
  useEffect(() => {
    if (rooms.length > 0) {
      const nameMap: { [key: number]: string } = {};
      rooms.forEach((room, index) => {
        nameMap[index] = room.name;
      });
      setLocalNames(nameMap);
    }
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="p-2">
        <button
          onClick={() => {
            setRooms(prev => {
              return prev.map(room => {
                return {
                  ...room,
                  show: true,
                };
              });
            });
          }}
        >
          전체보기
        </button>
        <button
          onClick={() => {
            setRooms(prev => {
              return prev.map(room => {
                return {
                  ...room,
                  show: false,
                };
              });
            });
          }}
        >
          전체숨기기
        </button>
      </div>
      {newRooms.length > 0 &&
        newRooms.map((room, i) => {
          const inputValue =
            localNames[i] !== undefined ? localNames[i] : room.name;
          return (
            <div
              className="mb-1 p-1 box-border"
              key={`room-panel-${room.index}`}
            >
              <div
                draggable={true}
                className="hover:pointer"
                onDragStart={e => ondDragStart(e, room)}
                onDragOver={e => {
                  onDragOverFun(e);
                }}
                onDrop={e => {
                  onDragDropFun(e, room);
                }}
              >
                <span>🔗</span>
                {room.index}.{' '}
                <span
                  className="w-3 inline-block h-3"
                  style={{ backgroundColor: roomColorString(room.index) }}
                ></span>
                이름 :
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => handleInputChange(e, i)}
                  onBlur={() => handleInputBlur(i, room.index)}
                />
              </div>
              <div className="mt-1">
                보기 :{' '}
                <input
                  type="checkbox"
                  checked={Boolean(room.show)}
                  onChange={e => {
                    setRooms(prev => {
                      const newRooms = [...prev];
                      newRooms[i] = {
                        ...newRooms[i],
                        show: e.target.checked,
                      };
                      return newRooms;
                    });
                  }}
                />
                <button
                  onClick={() => {
                    const isCreating = Boolean(room.creating);
                    if (isCreating) {
                      setRooms(prev => {
                        const newRooms = [...prev];
                        newRooms[i].creating = undefined;
                        return newRooms;
                      });
                    } else {
                      // 다른 지정 중인 방을 종료하고 이 방을 지정하기
                      setRooms(prev => {
                        const newRooms = [...prev];
                        newRooms.forEach(room => {
                          room.creating = undefined;
                        });
                        newRooms[i].creating = true;
                        return newRooms;
                      });
                    }
                  }}
                  disabled={Boolean(creatingRoom) && creatingRoom !== room}
                >
                  {Boolean(room.creating) ? '지정 종료하기' : '지정하기'}
                </button>
                <button
                  onClick={() => {
                    setRooms(prev => {
                      const newRooms = [...prev];
                      newRooms[i].border = [];
                      return newRooms;
                    });
                  }}
                >
                  초기화
                </button>
                <button
                  onClick={() => {
                    setRooms(prev => {
                      const newRooms = [...prev];
                      newRooms.splice(i, 1);
                      return newRooms;
                    });
                  }}
                >
                  삭제
                </button>
              </div>
              <div>
                <button
                  onClick={() => {
                    const three = getAtomValue(threeExportsAtom);
                    if (!three) {
                      return console.log('no Three');
                    }
                    const { camera } = three;
                    setRooms(prev => {
                      const copied = [...prev];
                      copied[i].tourMatrix = camera.matrix.toArray();
                      return copied;
                    });
                  }}
                >
                  투어 카메라위치 설정하기
                </button>
                {room.tourMatrix && (
                  <div className="flex items-center gap-4">
                    <div>
                      <span>위치</span>
                      <div>X : {room.tourMatrix[12].toFixed(2)}</div>
                      <div>Y : {room.tourMatrix[13].toFixed(2)}</div>
                      <div>Z : {room.tourMatrix[14].toFixed(2)}</div>
                    </div>
                    <div>
                      <span>회전</span>
                      <div>
                        X :{' '}
                        {(() => {
                          const threeMatrix = new THREE.Matrix4().fromArray(
                            room.tourMatrix,
                          ); // 배열에서 행렬 생성
                          const euler = new THREE.Euler().setFromRotationMatrix(
                            threeMatrix,
                          ); // 회전값 추출
                          return THREE.MathUtils.radToDeg(euler.x).toFixed(2);
                        })()}
                      </div>
                      <div>
                        Y :{' '}
                        {(() => {
                          const threeMatrix = new THREE.Matrix4().fromArray(
                            room.tourMatrix,
                          ); // 배열에서 행렬 생성
                          const euler = new THREE.Euler().setFromRotationMatrix(
                            threeMatrix,
                          ); // 회전값 추출
                          return THREE.MathUtils.radToDeg(euler.y).toFixed(2);
                        })()}
                      </div>
                      <div>
                        Z :{' '}
                        {(() => {
                          const threeMatrix = new THREE.Matrix4().fromArray(
                            room.tourMatrix,
                          ); // 배열에서 행렬 생성
                          const euler = new THREE.Euler().setFromRotationMatrix(
                            threeMatrix,
                          ); // 회전값 추출
                          return THREE.MathUtils.radToDeg(euler.z).toFixed(2);
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={() => {
            setRooms([]);
          }}
        >
          전체삭제
        </button>
        <button onClick={createRoom}>방 추가</button>
        <button onClick={uploadRooms}>업로드</button>
        <button
          onClick={() => {
            loadRooms().then(res => {
              setRooms(res);
            });
          }}
        >
          불러오기
        </button>
      </div>
    </div>
  );
}

export default RoomSetting;
