import { useAtom } from 'jotai';
import { roomColorString } from '../Constants';
import { roomAtom } from '../scripts/atoms';

function RoomSetting() {
  const [rooms, setRooms] = useAtom(roomAtom);
  const createRoom = () => {
    setRooms(prev => {
      return [
        ...prev,
        {
          name: '방',
          border: [],
          show: true,
        },
      ];
    });
  };

  const exportRooms = () => {
    alert('구현중');
  };

  const creatingRoom = rooms.find(room => Boolean(room.creating));

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
      {rooms.map((room, i) => {
        return (
          <div className="mb-1 p-1 box-border" key={`room-${i}`}>
            <div>
              {i + 1}.{' '}
              <span
                className="w-3 inline-block h-3"
                style={{ backgroundColor: roomColorString(i) }}
              ></span>
              이름 :
              <input
                type="text"
                value={room.name}
                onChange={e => {
                  setRooms(prev => {
                    const newRooms = [...prev];
                    newRooms[i] = {
                      ...newRooms[i],
                      name: e.target.value.trim(),
                    };
                    return newRooms;
                  });
                }}
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
                      console.log('prev', prev);
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
        <button onClick={exportRooms}>방 내보내기</button>
      </div>
    </div>
  );
}

export default RoomSetting;
