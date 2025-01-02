import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';
import { hotspotAtom, roomAtom, threeExportsAtom } from '../scripts/atoms';

function HotspotPanel() {
  const [hotspots, setHotspots] = useAtom(hotspotAtom);
  const rooms = useAtomValue(roomAtom);
  const threeExports = useAtomValue(threeExportsAtom);
  const [writeContent, setWriteContent] = useState(false);
  const createHotspot = () => {
    setHotspots(prev => {
      const copied = [...prev];
      copied.push({
        name: '핫스팟',
        index: prev.length + 1,
        rooms: [],
        content: {
          title: '제목',
          header: '',
          headerDetail: '',
          image: '',
          footer: [''],
          price: '',
        },
      });
      return copied;
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <ul className="mb-4">
        {hotspots.map((hotspot, i) => {
          return (
            <li
              className="p-2 border-b-2 border-b-slate-600"
              key={`hotspot-list-${hotspot.index}`}
            >
              <div className="mb-1">
                {i + 1}.{' '}
                <input
                  type="text"
                  value={hotspot.name}
                  onChange={e => {
                    setHotspots(prev => {
                      const copied = [...prev];
                      copied[i].name = e.target.value;
                      return copied;
                    });
                  }}
                />
                <button
                  onClick={() => {
                    setHotspots(prev => {
                      const copied = [...prev];
                      copied.splice(i, 1);
                      return copied;
                    });
                  }}
                >
                  삭제
                </button>
              </div>
              <div className="pl-3 mb-2">
                <button
                  onClick={() => {
                    setHotspots(prev => {
                      const copied = [...prev];
                      copied[i].positionSetting = !copied[i].positionSetting;
                      return copied;
                    });
                  }}
                  disabled={
                    hotspots.some(hotspot => hotspot.positionSetting)
                      ? hotspots.find(hotspot => hotspot.positionSetting)
                          ?.index !== hotspot.index
                      : false
                  }
                >
                  {hotspot.positionSetting ? '위치설정 종료' : '위치 설정하기'}
                </button>
                {hotspot.position && (
                  <div>
                    X:
                    <input
                      type="number"
                      value={hotspot.position[0]}
                      step={0.01}
                      onChange={e => {
                        setHotspots(prev => {
                          const copied = [...prev];
                          copied.find(
                            h => h.index === hotspot.index,
                          )!.position![0] = parseFloat(e.target.value);
                          return copied;
                        });
                        const scene = threeExports?.scene;
                        if (scene) {
                          scene.traverseAll(obj => {
                            if (obj.vUserData.hotspotIndex === hotspot.index) {
                              obj.position.x = parseFloat(e.target.value);
                            }
                          });
                        }
                      }}
                    ></input>{' '}
                    <br></br>
                    Y:
                    <input
                      type="number"
                      value={hotspot.position[1]}
                      step={0.01}
                      onChange={e => {
                        setHotspots(prev => {
                          const copied = [...prev];
                          copied.find(
                            h => h.index === hotspot.index,
                          )!.position![1] = parseFloat(e.target.value);
                          return copied;
                        });
                        const scene = threeExports?.scene;
                        if (scene) {
                          scene.traverseAll(obj => {
                            if (obj.vUserData.hotspotIndex === hotspot.index) {
                              obj.position.y = parseFloat(e.target.value);
                            }
                          });
                        }
                      }}
                    ></input>{' '}
                    <br></br>
                    Z:
                    <input
                      type="number"
                      value={hotspot.position[2]}
                      step={0.01}
                      onChange={e => {
                        setHotspots(prev => {
                          const copied = [...prev];
                          copied.find(
                            h => h.index === hotspot.index,
                          )!.position![2] = parseFloat(e.target.value);
                          return copied;
                        });
                        const scene = threeExports?.scene;
                        if (scene) {
                          scene.traverseAll(obj => {
                            if (obj.vUserData.hotspotIndex === hotspot.index) {
                              obj.position.z = parseFloat(e.target.value);
                            }
                          });
                        }
                      }}
                    ></input>
                  </div>
                )}
              </div>
              <div className="pl-3 ">
                <div className="mb-2">
                  <button
                    onClick={() => {
                      setHotspots(prev => {
                        const copied = [...prev];
                        copied[i].rooms = [];
                        return copied;
                      });
                    }}
                  >
                    방 초기화
                  </button>
                  방:{' '}
                  <span>
                    {rooms
                      .filter(room => hotspot.rooms.includes(room.index))
                      .map(room => room.name)
                      .join(', ')}
                  </span>
                </div>

                <label>방추가</label>
                <select
                  onChange={e => {
                    setHotspots(prev => {
                      const copied = [...prev];
                      const roomIdx = parseInt(e.target.value);
                      const thisOptionRooms = [
                        ...copied.find(
                          option => option.index === hotspot.index,
                        )!.rooms,
                        roomIdx,
                      ];
                      const uniqueRooms = [...new Set(thisOptionRooms)];
                      copied.find(
                        option => option.index === hotspot.index,
                      )!.rooms = uniqueRooms;
                      return copied;
                    });
                  }}
                >
                  {rooms.map(room => {
                    return (
                      <option
                        value={room.index}
                        key={`hotspot-room-selection-${room.index}`}
                      >
                        {room.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                className="mt-3 ml-3 "
                onClick={() => {
                  setWriteContent(prev => !prev);
                }}
              >
                {writeContent ? '내용 접기' : '내용 작성'}
              </button>

              {writeContent && (
                <div className="pl-3 ">
                  <label>제목</label>
                  <input
                    type="text"
                    value={hotspot.content.title}
                    onChange={e => {
                      setHotspots(prev => {
                        const copied = [...prev];
                        copied[i].content.title = e.target.value;
                        return copied;
                      });
                    }}
                  />
                  <br></br>
                  <label>품명</label>
                  <input
                    type="text"
                    value={hotspot.content.header}
                    onChange={e => {
                      setHotspots(prev => {
                        const copied = [...prev];
                        copied[i].content.header = e.target.value;
                        return copied;
                      });
                    }}
                  />
                  <br></br>
                  <label>품명 상세</label>
                  <input
                    type="text"
                    value={hotspot.content.headerDetail}
                    onChange={e => {
                      setHotspots(prev => {
                        const copied = [...prev];
                        copied[i].content.headerDetail = e.target.value;
                        return copied;
                      });
                    }}
                  />
                  <br></br>
                  <label>이미지</label>
                  <input
                    type="text"
                    value={hotspot.content.image}
                    onChange={e => {
                      setHotspots(prev => {
                        const copied = [...prev];
                        copied[i].content.image = e.target.value;
                        return copied;
                      });
                    }}
                  />
                  <br></br>
                  <label>바디1</label>
                  <textarea
                    value={hotspot.content.footer[0] ?? ''}
                    onChange={e => {
                      setHotspots(prev => {
                        const copied = [...prev];
                        copied[i].content.footer[0] = e.target.value;
                        return copied;
                      });
                    }}
                  />
                  <br></br>
                  <label>바디2</label>
                  <textarea
                    value={hotspot.content.footer[1] ?? ''}
                    onChange={e => {
                      setHotspots(prev => {
                        const copied = [...prev];
                        copied[i].content.footer[1] = e.target.value;
                        return copied;
                      });
                    }}
                  />
                  <br></br>
                  <label>가격</label>
                  <textarea
                    value={hotspot.content.price ?? ''}
                    onChange={e => {
                      setHotspots(prev => {
                        const copied = [...prev];
                        copied[i].content.price = e.target.value;
                        return copied;
                      });
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button onClick={createHotspot}>핫스팟 추가</button>
        <button
          onClick={() => {
            setHotspots([]);
          }}
        >
          전체삭제
        </button>
      </div>
    </div>
  );
}

export default HotspotPanel;
