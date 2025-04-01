import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';
import {
  getAtomValue,
  hotspotAtom,
  newRoomAtom,
  setAtomValue,
  settingsAtom,
  threeExportsAtom,
} from '../scripts/atoms';
import { loadHotspot, uploadJson } from '../scripts/atomUtils';

const uploadHotspot = async () => {
  const hotspots = getAtomValue(hotspotAtom);

  uploadJson('hotspots.json', hotspots)
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

function HotspotPanel() {
  const [hotspots, setHotspots] = useAtom(hotspotAtom);
  // const rooms = useAtomValue(roomAtom);
  const newRooms = useAtomValue(newRoomAtom);
  const threeExports = useAtomValue(threeExportsAtom);
  const [writeContent, setWriteContent] = useState(false);
  const [settings, setSettings] = useAtom(settingsAtom);

  const createHotspot = () => {
    setHotspots(prev => {
      const copied = [...prev];
      copied.push({
        name: '핫스팟',
        isoView: false,
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
      <div className="p-2 flex gap-3">
        <div>
          <label>핫스팟 보기</label>
          <input
            type="checkbox"
            checked={settings.shotHotspots}
            onChange={e => {
              setSettings(prev => {
                return {
                  ...prev,
                  shotHotspots: e.target.checked,
                };
              });
            }}
          ></input>
        </div>

        <div>
          <label>방에 따른 옵션 보기</label>
          <input
            type="checkbox"
            checked={settings.detectHotspotRoom}
            onChange={e => {
              setSettings(prev => {
                return {
                  ...prev,
                  detectHotspotRoom: e.target.checked,
                };
              });
            }}
          ></input>
        </div>
        <div>
          <label>아이콘사이즈</label>
          <input
            type="number"
            value={settings.hotspotSize ?? 0.12}
            onChange={e => {
              setSettings(prev => {
                return {
                  ...prev,
                  hotspotSize: parseFloat(e.target.value),
                };
              });
            }}
            min={0.01}
            max={0.5}
            step={0.005}
          ></input>
        </div>
      </div>
      <ul className="mb-4">
        {hotspots.map((hotspot, i) => {
          return (
            <li
              className="p-2 border-b-2 border-b-slate-600"
              key={`hotspot-list-${hotspot.index}-${i}`}
            >
              <div className="mb-1">
                {hotspot.index}.{' '}
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
                <span>isoView</span>
                <input
                  type="checkbox"
                  checked={hotspot.isoView}
                  onChange={event => {
                    setHotspots(pre =>
                      pre.map(data =>
                        data.index === hotspot.index
                          ? {
                              ...data,
                              isoView: !data.isoView,
                            }
                          : data,
                      ),
                    );
                  }}
                />
              </div>
              <div className="pl-3 mb-2 grid grid-cols-2">
                <div>
                  <button
                    onClick={() => {
                      setHotspots(prev => {
                        const copied = [...prev];
                        copied[i].targetSetting = !copied[i].targetSetting;
                        return copied;
                      });
                    }}
                    disabled={
                      hotspots.some(hotspot => hotspot.targetSetting)
                        ? hotspots.find(hotspot => hotspot.targetSetting)
                            ?.index !== hotspot.index
                        : false
                    }
                  >
                    {hotspot.targetSetting ? '타겟설정 종료' : '타겟 설정하기'}
                  </button>
                  {hotspot.target && (
                    <div>
                      X:
                      <input
                        type="number"
                        value={hotspot.target[0]}
                        step={0.01}
                        onChange={e => {
                          setHotspots(prev => {
                            const copied = [...prev];
                            copied.find(
                              h => h.index === hotspot.index,
                            )!.target![0] = parseFloat(e.target.value);
                            return copied;
                          });
                          const scene = threeExports?.scene;
                          if (scene) {
                            scene.traverseAll(obj => {
                              if (
                                obj.vUserData.hotspotIndex === hotspot.index
                              ) {
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
                        value={hotspot.target[1]}
                        step={0.01}
                        onChange={e => {
                          setHotspots(prev => {
                            const copied = [...prev];
                            copied.find(
                              h => h.index === hotspot.index,
                            )!.target![1] = parseFloat(e.target.value);
                            return copied;
                          });
                          const scene = threeExports?.scene;
                          if (scene) {
                            scene.traverseAll(obj => {
                              if (
                                obj.vUserData.hotspotIndex === hotspot.index
                              ) {
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
                        value={hotspot.target[2]}
                        step={0.01}
                        onChange={e => {
                          setHotspots(prev => {
                            const copied = [...prev];
                            copied.find(
                              h => h.index === hotspot.index,
                            )!.target![2] = parseFloat(e.target.value);
                            return copied;
                          });
                          const scene = threeExports?.scene;
                          if (scene) {
                            scene.traverseAll(obj => {
                              if (
                                obj.vUserData.hotspotIndex === hotspot.index
                              ) {
                                obj.position.z = parseFloat(e.target.value);
                              }
                            });
                          }
                        }}
                      ></input>
                    </div>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => {
                      const three = getAtomValue(threeExportsAtom);
                      if (!three) {
                        return;
                      }
                      const { camera } = three;
                      setHotspots(prev => {
                        const copied = [...prev];
                        copied[i].cameraMatrix = camera.matrix.toArray();
                        return copied;
                      });
                    }}
                  >
                    카메라위치 설정하기
                  </button>
                  {hotspot.cameraMatrix && (
                    <div>
                      <div>X : {hotspot.cameraMatrix[12]}</div>
                      <div>Y : {hotspot.cameraMatrix[13]}</div>
                      <div>Z : {hotspot.cameraMatrix[14]}</div>
                    </div>
                  )}
                </div>
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
                    {newRooms
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
                  {newRooms.map(room => {
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
        <button onClick={uploadHotspot}>업로드</button>
        <button
          onClick={() => {
            loadHotspot()
              .then(hotspot => {
                if (hotspot) {
                  setAtomValue(hotspotAtom, hotspot);
                  alert('핫스팟 로드완료');
                } else {
                  throw hotspot;
                }
              })
              .catch(err => {
                console.error(err);
                alert('핫스팟 로드실패');
              });
          }}
        >
          불러오기
        </button>
      </div>
    </div>
  );
}

export default HotspotPanel;
