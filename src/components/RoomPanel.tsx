import { useAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { THREE } from 'VTHREE';
import { ENV, newRoomColorString } from '../Constants';

import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import {
  generateGridPointsInsidePolygon,
  getContourPolygon2D,
  meshInsidePoint,
} from 'src/scripts/utils';
import Workers from 'src/scripts/Workers';
import {
  IncludeRoomType,
  MeshInfoType,
  occlusionType,
  Point2D,
  Walls,
} from 'src/types';
import {
  getAtomValue,
  newRoom,
  newRoomAtom,
  newRoomCreateOption,
  threeExportsAtom,
} from '../scripts/atoms';
import { loadRooms, uploadJson } from '../scripts/atomUtils';
import wallDataUrl from '/src/assets/walls.json?url';
type OpenState = {
  [key: number]: boolean;
};

const uploadRooms = async () => {
  // const hotspots = getAtomValue(roomAtom);
  const hotspots = getAtomValue(newRoomAtom);

  uploadJson('rooms_test.json', hotspots)
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

const mapData = new Map<
  string,
  { index: number; points: Point2D[]; dp: number[] }
>();
function RoomSetting() {
  const [newRooms, setNewRooms] = useAtom(newRoomAtom);
  const [newRoomsArray, setNewRoomsArray] = useState<newRoomCreateOption[]>([]);
  const [MeshArray, setMeshArray] = useState<THREE.Mesh[]>([]);
  const [meshInfoArray, setMeshInfoArray] = useState<MeshInfoType[]>([]);
  const [meshNameArray, setMeshNameArray] = useState<string[]>([]);
  const [wallData, setWallData] = useState<Walls | null>(null);
  const [navMesh, setNavMesh] = useState<THREE.Mesh | null>(null);
  const [isOpen, setOpen] = useState<OpenState>({});
  const [occlusion, setOcclusion] = useState<occlusionType[]>([]);
  const [exteriorMeshes, setExteriorMeshes] = useState<number[]>([]);
  const [filterOcclusion, setFilterOcclusion] = useState<{
    meshArray: string[];
    pointArray: number[];
    exteriorMesh: number[];
    values: { index: number; points: Point2D[]; dp: number[] }[];
  } | null>(null);

  // const [rooms, setRooms] = useAtom(roomAtom);

  // const [roomsArray, setRoomsArray] = useState<RoomCreateOption[]>([]);

  // useEffect(() => {
  //   if (filterOcclusion.length > 0) {
  //     filterOcclusion.forEach((child, index) => {
  //       const key = child.dpName.toString();
  //       const keyString = mapData.get(key);
  //       if (keyString) {
  //         keyString.points.push(child.navPoint);
  //       } else {
  //         mapData.set(key, {
  //           index,
  //           points: [child.navPoint],
  //           dp: child.dpName,
  //         }); // 없으면 새 배열로 세팅
  //       }
  //     });

  //     console.log('mapData', mapData);
  //   }
  // }, [filterOcclusion]);
  // 각 방 이름의 로컬 상태를 관리할 객체
  const [localNames, setLocalNames] = useState<{ [key: number]: string }>({});
  // const createRoom = () => {
  //   setRooms(prev => {
  //     return [
  //       ...prev,
  //       {
  //         name: '방',
  //         border: [],
  //         show: true,
  //         tourMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  //         index: prev.length + 1,
  //       },
  //     ];
  //   });
  // };

  async function loadWallData(): Promise<any> {
    const response = await fetch(wallDataUrl);
    const data = await response.json();
    if (data) {
      setWallData(data);
    } else {
      console.warn('no wallData');
      setWallData(null);
    }
  }

  async function loadNav(): Promise<any> {
    const url = `${ENV.base}nav2.glb`;
    const loader = VGLTFLoader.instance;
    if (!loader) {
      throw new Error('VGLTFLoader is not initialized');
    }
    return loader.loadAsync(url);
  }

  const saveDpPointsArray = () => {
    if (!MeshArray || MeshArray.length < 1) {
      console.warn('dp정보 먼저 가져와주세요.');
    }
    setMeshNameArray([]);
    MeshArray.forEach(child => {
      const boundingBox = new THREE.Box3().setFromObject(child);
      const { min, max } = boundingBox;
      const meshPoint = boxPoint(min, max);
      setMeshNameArray(pre => [...pre, child.name]);
      setMeshInfoArray(pre => [
        ...pre,
        {
          name: child.name,
          box: {
            min,
            max,
          },
          point: meshPoint,
        },
      ]);
    });
  };

  const findExteriorWall = () => {
    if (!navMesh || !wallData) {
      return;
    }
    console.time();

    Workers.processExteriorMeshes(wallData.points, meshInfoArray, meshNameArray)
      .then(results => {
        console.timeEnd();
        console.log('processExteriorMeshes', results);

        setFilterOcclusion(pre => ({
          meshArray: meshNameArray,
          pointArray: pre?.pointArray ?? [],
          exteriorMesh: results,
          values: Array.from(mapData.values()),
        }));
      })
      .catch(err => {
        console.error(err);
      });
  };

  const checkDPCollusion = () => {
    let insideDpArray: { navPoint: number[]; dpName: string[] }[] = [];
    if (!navMesh || !wallData) {
      return;
    }

    const geometry = navMesh.geometry as THREE.BufferGeometry;

    if (!geometry.boundingBox) {
      return console.warn('no geometry');
    }
    const polygon: Point2D[] = getContourPolygon2D(navMesh);
    const newPoints = meshInsidePoint(
      polygon,
      geometry.boundingBox?.min,
      geometry.boundingBox?.max,
    );
    const newPointArray = [newPoints[0]];

    // Workers.fetch(`${ENV.base}nav2.glb`, false)
    //   .then(res => {
    //     console.log(res);
    //   })
    //   .catch(err => {
    //     console.error(err.message);
    //   });
    console.time();
    Workers.processNavPoints(newPoints, meshInfoArray, wallData)
      .then(results => {
        console.timeEnd();
        console.log('results', results);
        setOcclusion(results);
      })
      .catch(err => {
        console.error(err);
      });
    // newPoints.forEach(navPoints => {
    //   let navPointsArray: string[] = [];
    //   dpInfoArray.forEach(dpInfo => {
    //     const result = checkBoxToObject(navPoints, dpInfo.point, wallData);
    //     if (result) {
    //       navPointsArray.push(dpInfo.name);
    //     }
    //   });
    //   insideDpArray.push({ navPoint: navPoints, dpName: navPointsArray });
    // });
  };

  const filterOcclusionFun = () => {
    mapData.clear();
    if (occlusion.length < 1) {
      console.warn('바닥 선분분석 먼저 완료해주세요.');
    }
    console.time();
    let newPointArray: number[] = [];

    Workers.filterNavArray(occlusion)
      .then(results => {
        console.timeEnd();
        // setFilterOcclusion(results);
        results.forEach((child, index) => {
          const key = child.dpName.toString();
          const keyString = mapData.get(key);
          const newPoint: Point2D = [
            newPointArray.indexOf(child.navPoint[0]),
            newPointArray.indexOf(child.navPoint[1]),
          ];
          const newDpArray: number[] = child.dpName.map((dp: string) =>
            meshNameArray.indexOf(dp),
          );
          if (keyString) {
            keyString.points.push(newPoint);
          } else {
            mapData.set(key, {
              index,
              points: [newPoint],
              dp: newDpArray,
            }); // 없으면 새 배열로 세팅
          }
        });
        setFilterOcclusion(pre => ({
          exteriorMesh: pre?.exteriorMesh ?? [],
          meshArray: pre?.meshArray ?? meshNameArray,
          pointArray: newPointArray,
          values: Array.from(mapData.values()),
        }));
      })
      .catch(err => {
        console.error(err);
      });
  };

  function downloadJsonFile<T>(data: T, filename: string) {
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const newCreateRoom = () => {
    setNewRooms(prev => {
      return [
        ...prev,
        {
          index: prev.length + 1,
          name: '방',
          visible: true,
          roomInfo: [
            {
              index: `${prev.length + 1}` + `${prev.length + 1}`,
              border: [],
              show: true,
              visible: false,
              tourMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
              inCludeMesh: [],
            },
          ],
        },
      ];
    });
  };

  const boxPoint = (min: THREE.Vector3, max: THREE.Vector3) => {
    const points: Point2D[] = [];

    for (
      let x = min.x;
      x <= max.x;
      x += max.x === min.x || max.x - min.x >= 0.1 ? 0.1 : max.x - min.x
    ) {
      for (
        let y = min.z;
        y <= max.z;
        y += max.z === min.z || max.z - min.z >= 0.1 ? 0.1 : max.z - min.z
      ) {
        const point: Point2D = [x, y];

        points.push(point);
      }
    }
    return points;
  };

  const checkDpInRoom = (room: newRoom) => {
    if (MeshArray.length < 1 || !wallData) {
      return console.warn('Dp가져오기와 벽 정보 가져오기기 부터 해주세요.');
    } else {
      let insideDpArray: string[] = [];
      const generatedPoints = generateGridPointsInsidePolygon(room.border);
      // debugger;
      // const boxes = DpArray.map(dp => {
      //   const box = new THREE.Box3().setFromObject(dp);
      //   return {
      //     min: box.min,
      //     max: box.max,
      //   };
      // });
      // debugger;
      // console.log("boxes.length",boxes.length);
      // const boxPoints = boxes.map(({ min, max }, i) => {
      //   const points = boxPoint(min, max);
      //   console.log(`${i + 1} / ${boxes.length} : ${points}`)
      //   return points;
      // });
      // debugger;

      // boxPoints.forEach((meshPoint, i) => {
      //   console.log(`${i + 1} / ${boxPoints.length}`);
      //   const result = checkBoxToObject(generatedPoints, meshPoint, wallData);
      //   if (result) {
      //     insideDpArray.push(result);
      //   }
      // });
      // debugger;

      // DpArray.forEach(child => {
      //   const boundingBox = new THREE.Box3().setFromObject(child);
      //   const { min, max } = boundingBox;
      //   const meshPoint = boxPoint(min, max);
      //   const result = checkBoxToObject(generatedPoints, meshPoint, wallData);
      //   if (result) {
      //     insideDpArray.push(child.name);
      //   }
      // });
      setNewRooms(prev =>
        prev.map((prevChild, index) => ({
          ...prevChild,
          roomInfo: prevChild.roomInfo.map(roomChild =>
            roomChild.index === room.index
              ? {
                  ...roomChild,
                  inCludeMesh: insideDpArray,
                }
              : roomChild,
          ),
        })),
      );
      if (isOpen && !isOpen[Number(room.index)]) {
        const keyNumber = Number(room.index);
        setOpen(prev => ({
          ...prev,
          [keyNumber]: true,
        }));
      }

      console.log('insideDpArray', insideDpArray);
    }
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
      setNewRooms(prev => {
        const newRooms = [...prev];
        newRooms[index] = {
          ...newRooms[index],
          name: localNames[index],
        };
        return newRooms;
      });
      // setRooms(prev => {
      //   const newRooms = [...prev];
      //   newRooms[index] = {
      //     ...newRooms[index],
      //     name: localNames[index],
      //   };
      //   return newRooms;
      // });
    }
  };
  // const creatingRoom = rooms.find(room => Boolean(room.creating));

  const newCreatingRoom = newRooms.find(
    room =>
      room.roomInfo &&
      room.roomInfo.length > 0 &&
      Boolean(room.roomInfo.forEach(child => child.creating)),
  );

  const ondDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    childData: newRoomCreateOption,
    // childData: RoomCreateOption,
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
    childData: newRoomCreateOption,
    // childData: RoomCreateOption,
  ) => {
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;

    const area = e.nativeEvent.offsetY / target.clientHeight;
    const draggedId = Number(e.dataTransfer.getData('text/plain'));
    // console.log('childData', childData.index, draggedId);

    if (draggedId === childData.index) {
      return;
    }
    const dropRooms = [...newRoomsArray];
    // const dropRooms = [...roomsArray];

    const copyIndex = dropRooms[childData.index - 1].index;
    dropRooms[childData.index - 1].index = draggedId;
    dropRooms[draggedId - 1].index = copyIndex;
    dropRooms.sort((l, r) => {
      return l.index - r.index;
    });
    setNewRooms(dropRooms);
    // setRooms(dropRooms);
  };

  const directions3D = useMemo<THREE.Vector3[]>(() => {
    const arr: THREE.Vector3[] = [];
    const step = 5; // 10° 간격
    for (let deg = 0; deg < 360; deg += step) {
      const θ = THREE.MathUtils.degToRad(deg);
      // y를 –1로 주어 “내려오는” 대각선 레이 생성
      arr.push(new THREE.Vector3(Math.cos(θ), 0, Math.sin(θ)).normalize());
    }
    return arr;
  }, []);

  // 광선 시각화 헬퍼 함수
  const visualizeRay = (
    scene: THREE.Scene,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    length: number = 100, // 광선 길이 (디버깅용)
    color: number = 0xff0000, // 빨간색으로 표시
  ) => {
    // 광선의 끝점 계산
    const endPoint = origin
      .clone()
      .add(direction.clone().multiplyScalar(length));

    // 광선을 나타내는 선분 생성
    const geometry = new THREE.BufferGeometry().setFromPoints([
      origin,
      endPoint,
    ]);
    const material = new THREE.LineBasicMaterial({
      color,
      depthTest: false, // ✅ 깊이 무시
      transparent: true,
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 99;

    line.name = '광선';
    // 장면에 추가
    scene.add(line);

    // 디버깅: 일정 시간 후 제거 (필요 시 주석 해제)
    // setTimeout(() => {
    //   scene.remove(line);
    //   geometry.dispose();
    //   material.dispose();
    // }, 5000); // 5초 후 제거
  };

  const findOtherRoomFun = (
    border: [number, number][],
    newRoomData: newRoom,
  ) => {
    const three = getAtomValue(threeExportsAtom);
    if (!three) {
      return console.log('no Three');
    }

    const raycaster = new THREE.Raycaster();
    // y는 원하는 높이로 설정

    const objectsToTest = [...three.scene.children];

    const newChildren = objectsToTest.filter(child => {
      const name = child.name.toLowerCase();

      return (
        !name.includes('광선') && !name.includes(`방 바닥_${newRoomData.index}`)
      );
    });

    console.log('탐지 대상 객체:', newChildren);
    const includeRoom: IncludeRoomType[] = [];
    const includeMesh: string[] = [];
    border.forEach(([x, z]) => {
      const origin = new THREE.Vector3(x, 0.099, z);

      for (const dir of directions3D) {
        // ✅ 매 방향마다 현재까지 감지된 mesh(uuid) 제외
        const filteredChildren = newChildren.filter(
          child => !includeMesh.includes(child.uuid),
        );

        raycaster.set(origin, dir.normalize());
        const hits = raycaster.intersectObjects(filteredChildren, true);
        const newHits = hits.filter(child => {
          return !child.object.name.toLocaleLowerCase().includes('dp');
        });
        // visualizeRay(three.scene, origin, dir.normalize(), 100, 0xff0000);
        for (const hit of newHits) {
          const name = hit.object.name.toLowerCase();
          const parentUuid = hit.object.parent?.uuid;
          const info = hit.object.userData.roomData as
            | IncludeRoomType
            | undefined;

          if (
            newHits[0].object.name.toLowerCase().includes('base') ||
            newHits[0].object.name.toLowerCase().includes('m') ||
            newHits[0].object.name.toLowerCase().includes('door') ||
            newHits[0].object.name.toLowerCase().includes('프레임') ||
            newHits[0].object.name.toLowerCase().includes('plane')
          ) {
            continue;
          }
          if (
            info &&
            name.includes('방바닥') &&
            !includeRoom.some(r => r.roomInfo.index === info.roomInfo.index)
          ) {
            visualizeRay(three.scene, origin, dir.normalize(), 100, 0xff0000);
            includeRoom.push(info);
            if (parentUuid) {
              includeMesh.push(parentUuid);
            }

            break; // ✅ 이 방향은 끝났으니 다음 방향으로
          }
        }
      }
    });

    return includeRoom;
  };

  useEffect(() => {
    if (newRooms.length > 0) {
      const sorted = [...newRooms];
      sorted.sort((l, r) => {
        return l.index - r.index;
      });
      setNewRoomsArray(sorted);
    } else {
      setNewRoomsArray([]);
    }
    // if (rooms.length > 0) {
    //   const sorted = [...rooms];
    //   sorted.sort((l, r) => {
    //     return l.index - r.index;
    //   });
    //   setRoomsArray(sorted);
    // } else {
    //   setRoomsArray([]);
    // }
  }, [newRooms]);
  useEffect(() => {
    if (newRooms.length > 0) {
      const nameMap: { [key: number]: string } = {};
      newRooms.forEach((room, index) => {
        nameMap[index] = room.name;
      });
      setLocalNames(nameMap);
    }
    // if (rooms.length > 0) {
    //   const nameMap: { [key: number]: string } = {};
    //   rooms.forEach((room, index) => {
    //     nameMap[index] = room.name;
    //   });
    //   setLocalNames(nameMap);
    // }
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="p-2">
        <button
          onClick={() => {
            setNewRooms(prev =>
              prev.map(room => ({
                ...room,
                roomInfo: room.roomInfo.map((info, index) => ({
                  ...info,
                  show: index === 0 ? true : false,
                })),
              })),
            );
          }}
        >
          전체보기
        </button>
        <button
          onClick={() => {
            setNewRooms(prev =>
              prev.map(room => ({
                ...room,
                roomInfo: room.roomInfo.map(info => ({
                  ...info,
                  show: false,
                })),
              })),
            );
          }}
        >
          전체숨기기
        </button>
        {/* <button
          onClick={() => {
            const three = getAtomValue(threeExportsAtom);
            if (!three) {
              return console.log('no Three');
            }
            const { scene } = three;
            console.log('scene', scene);
            scene.traverseAll(child => {
              if (child.name.includes('광선')) {
                child.removeFromParent();
                child.geometry.dispose();
                child.material.dispose();
              }
            });
          }}
        >
          광선삭제
        </button> */}
        <button
          onClick={() => {
            setMeshArray(pre => [...pre]);
            const three = getAtomValue(threeExportsAtom);
            if (!three) {
              return console.log('no Three');
            }
            const { scene } = three;
            const meshArray = scene.meshes();
            setMeshArray(meshArray);
          }}
        >
          mesh 가져오기 {MeshArray.length > 1 ? '완료' : '미정'}
        </button>
        <button
          onClick={() => {
            saveDpPointsArray();
          }}
        >
          mesh정보 저장 {meshInfoArray.length > 1 ? '완료' : '미정'}
        </button>
        <button
          onClick={() => {
            loadWallData();
          }}
        >
          벽 정보 가져오기 {wallData ? '완료' : '미정'}
        </button>

        <button
          onClick={() => {
            loadNav()
              .then(data => {
                console.log('data', data);
                setNavMesh(data.scene.children[0]);
              })
              .catch(error => {
                console.error(error);
              });
          }}
        >
          바닥 정보 가져오기 {navMesh ? '완료' : '미정'}
        </button>
        <button
          onClick={() => {
            findExteriorWall();
          }}
        >
          벽외부에 있는 mesh만 분류
        </button>
        <button
          onClick={() => {
            if (MeshArray && wallData && navMesh) {
              checkDPCollusion();
            } else {
              console.warn(
                'DpArray :',
                MeshArray,
                'wallData :',
                wallData,
                'navMesh :',
                navMesh,
              );
            }
          }}
        >
          바닥 선분분석 {occlusion.length > 0 ? '완료' : '실행'}
        </button>
        <button
          onClick={() => {
            filterOcclusionFun();
          }}
        >
          바닥 선분정렬 {filterOcclusion ? '완료' : '실행'}
        </button>
      </div>
      {newRoomsArray.length > 0 &&
        newRoomsArray.map((room, i) => {
          const inputValue =
            localNames[i] !== undefined ? localNames[i] : room.name;
          return (
            <div
              className="mb-1 p-1 box-border"
              key={`room-panel-${room.index}`}
            >
              <div
                draggable={true}
                className="hover:pointer flex items-center"
                onDragStart={e => ondDragStart(e, room)}
                onDragOver={e => {
                  onDragOverFun(e);
                }}
                onDrop={e => {
                  onDragDropFun(e, room);
                }}
              >
                <span>🔗</span>
                {room.index}. 이름 :
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => handleInputChange(e, i)}
                  onBlur={() => handleInputBlur(i, room.index)}
                />
                <div>
                  <span>기본 적용</span>
                  <input
                    type="checkbox"
                    checked={Boolean(room.visible)}
                    onChange={e => {
                      setNewRooms(prev =>
                        prev.map((prevChild, index) => ({
                          ...prevChild,
                          visible: !prevChild.visible,
                        })),
                      );
                    }}
                  />
                </div>
              </div>
              <div>
                <button
                  onClick={() => {
                    setNewRooms(prev =>
                      prev.map((child, index) => {
                        if (room.index === child.index) {
                          const updatedChild = {
                            ...child,
                            roomInfo: [
                              ...child.roomInfo,
                              {
                                inCludeMesh: [],
                                index:
                                  `${child.index}` +
                                  `${child.roomInfo.length + 1}`,
                                border: [],
                                show: false,
                                visible: false,
                                tourMatrix: [
                                  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0,
                                  1,
                                ],
                              },
                            ],
                          };
                          return updatedChild;
                        }
                        return child;
                      }),
                    );
                  }}
                >
                  정보추가
                </button>
                <button
                  onClick={() => {
                    setNewRooms(prev =>
                      prev.filter(child => child.index !== room.index),
                    );
                  }}
                >
                  삭제
                </button>
              </div>

              <div>
                {room.roomInfo &&
                  room.roomInfo.length > 0 &&
                  room.roomInfo.map((child: newRoom, index) => {
                    return (
                      <div
                        key={`room_${child.tourMatrix}_${index}`}
                        className="flex items-center gap-4"
                      >
                        <div className="h-full">
                          <div className="mt-1">
                            보기 :{' '}
                            <input
                              type="checkbox"
                              checked={Boolean(child.show)}
                              onChange={e => {
                                setNewRooms(prev =>
                                  prev.map((prevChild, index) => ({
                                    ...prevChild,
                                    roomInfo: prevChild.roomInfo.map(
                                      roomChild =>
                                        roomChild.index === child.index
                                          ? {
                                              ...roomChild,
                                              show: !roomChild.show,
                                            }
                                          : roomChild,
                                    ),
                                  })),
                                );
                              }}
                            />
                            <button
                              onClick={() => {
                                const isCreating = Boolean(child.creating);

                                if (isCreating) {
                                  setNewRooms(prev =>
                                    prev.map((prevChild, index) => ({
                                      ...prevChild,
                                      roomInfo: prevChild.roomInfo.map(
                                        roomChild =>
                                          roomChild.index === child.index
                                            ? {
                                                ...roomChild,
                                                creating: !roomChild.creating,
                                              }
                                            : roomChild,
                                      ),
                                    })),
                                  );
                                } else {
                                  // 다른 지정 중인 방을 종료하고 이 방을 지정하기

                                  setNewRooms(prev =>
                                    prev.map((prevChild, index) => ({
                                      ...prevChild,
                                      roomInfo: prevChild.roomInfo.map(
                                        roomChild =>
                                          roomChild.index === child.index
                                            ? {
                                                ...roomChild,
                                                creating: true,
                                              }
                                            : {
                                                ...roomChild,
                                                creating: undefined,
                                              },
                                      ),
                                    })),
                                  );
                                }
                              }}
                              disabled={
                                Boolean(newCreatingRoom) &&
                                newCreatingRoom !== child.creating
                              }
                            >
                              {Boolean(child.creating)
                                ? '지정 종료하기'
                                : '지정하기'}
                            </button>
                            <button
                              onClick={() => {
                                setNewRooms(prev =>
                                  prev.map((prevChild, index) => ({
                                    ...prevChild,
                                    roomInfo: prevChild.roomInfo.filter(
                                      roomChild =>
                                        roomChild.index === child.index
                                          ? (roomChild.border = [])
                                          : roomChild,
                                    ),
                                  })),
                                );
                              }}
                            >
                              초기화
                            </button>
                            <button
                              onClick={() => {
                                setNewRooms(prev =>
                                  prev.map((prevChild, index) => ({
                                    ...prevChild,
                                    roomInfo: prevChild.roomInfo.filter(
                                      roomChild =>
                                        roomChild.index !== child.index,
                                    ),
                                  })),
                                );
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
                                setNewRooms(prev =>
                                  prev.map((prevChild, index) => ({
                                    ...prevChild,
                                    roomInfo: prevChild.roomInfo.map(
                                      roomChild =>
                                        roomChild.index === child.index
                                          ? {
                                              ...roomChild,
                                              tourMatrix:
                                                camera.matrix.toArray(),
                                            }
                                          : roomChild,
                                    ),
                                  })),
                                );
                              }}
                            >
                              투어 카메라위치 설정하기
                            </button>
                          </div>
                          {/* <div>
                            <button
                              onClick={() => {
                                const newRoomData = room.roomInfo.filter(
                                  roomChild => {
                                    return roomChild.index === child.index;
                                  },
                                );

                                const includeRoomData = findOtherRoomFun(
                                  child.border,
                                  newRoomData[0],
                                );
                                console.log('includeRoomData', includeRoomData);
                                setNewRooms(prev =>
                                  prev.map((prevChild, index) => ({
                                    ...prevChild,
                                    roomInfo: prevChild.roomInfo.map(
                                      roomChild =>
                                        roomChild.index === child.index
                                          ? {
                                              ...roomChild,
                                              inCludeRoom:
                                                includeRoomData || null,
                                            }
                                          : roomChild,
                                    ),
                                  })),
                                );
                              }}
                            >
                              보이는방 확인
                            </button>
                          </div> */}
                          <div>
                            <button
                              onClick={() => {
                                checkDpInRoom(child);
                              }}
                            >
                              보이는방 DP확인
                            </button>
                          </div>

                          {child.inCludeMesh &&
                            child.inCludeMesh.length > 0 && (
                              <div>
                                <button
                                  onClick={() => {
                                    setOpen(pre => {
                                      const key = Number(child.index);
                                      return {
                                        ...pre,
                                        [key]: !pre[key],
                                      };
                                    });
                                  }}
                                >
                                  {isOpen[Number(child.index)]
                                    ? '축소'
                                    : '확장'}
                                </button>
                                <button
                                  onClick={() => {
                                    setNewRooms(prev =>
                                      prev.map((prevChild, index) => ({
                                        ...prevChild,
                                        roomInfo: prevChild.roomInfo.map(
                                          roomChild =>
                                            roomChild.index === child.index
                                              ? {
                                                  ...roomChild,
                                                  inCludeMesh: [],
                                                }
                                              : roomChild,
                                        ),
                                      })),
                                    );
                                  }}
                                >
                                  방에 포함된 mesh초기화
                                </button>
                                {isOpen[Number(child.index)] && (
                                  <ul>
                                    {child.inCludeMesh.map(meshName => (
                                      <li key={`roomMeshName_${meshName}`}>
                                        {meshName}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                          {/* <div className="flex items-center">
                            <p>보이는방</p>
                            <ul className="flex items-center">
                              {child.inCludeRoom?.map(
                                (data: IncludeRoomType, index) => {
                                  return (
                                    <li key={`inCludeRoom_${index}`}>
                                      {data.parent.name},
                                    </li>
                                  );
                                },
                              )}
                            </ul>
                          </div> */}
                          <div className="flex items-center mt-1">
                            <p>색상</p>
                            <span
                              className="w-5 h-5 inline-block h-3"
                              style={{
                                backgroundColor: newRoomColorString(
                                  Number(child.index),
                                ),
                              }}
                            ></span>
                            기본 적용
                            <input
                              type="checkbox"
                              checked={Boolean(child.visible)}
                              onChange={e => {
                                setNewRooms(prev =>
                                  prev.map((prevChild, index) => ({
                                    ...prevChild,
                                    roomInfo: prevChild.roomInfo.map(
                                      roomChild =>
                                        roomChild.index === child.index
                                          ? {
                                              ...roomChild,
                                              visible: !roomChild.visible,
                                            }
                                          : roomChild,
                                    ),
                                  })),
                                );
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <span>위치</span>
                          <div>X : {child.tourMatrix[12].toFixed(2)}</div>
                          <div>Y : {child.tourMatrix[13].toFixed(2)}</div>
                          <div>Z : {child.tourMatrix[14].toFixed(2)}</div>
                        </div>
                        <div>
                          <span>회전</span>
                          <div>
                            X :{' '}
                            {(() => {
                              const threeMatrix = new THREE.Matrix4().fromArray(
                                child.tourMatrix,
                              ); // 배열에서 행렬 생성
                              const euler =
                                new THREE.Euler().setFromRotationMatrix(
                                  threeMatrix,
                                ); // 회전값 추출
                              return THREE.MathUtils.radToDeg(euler.x).toFixed(
                                2,
                              );
                            })()}
                          </div>
                          <div>
                            Y :{' '}
                            {(() => {
                              const threeMatrix = new THREE.Matrix4().fromArray(
                                child.tourMatrix,
                              ); // 배열에서 행렬 생성
                              const euler =
                                new THREE.Euler().setFromRotationMatrix(
                                  threeMatrix,
                                ); // 회전값 추출
                              return THREE.MathUtils.radToDeg(euler.y).toFixed(
                                2,
                              );
                            })()}
                          </div>
                          <div>
                            Z :{' '}
                            {(() => {
                              const threeMatrix = new THREE.Matrix4().fromArray(
                                child.tourMatrix,
                              ); // 배열에서 행렬 생성
                              const euler =
                                new THREE.Euler().setFromRotationMatrix(
                                  threeMatrix,
                                ); // 회전값 추출
                              return THREE.MathUtils.radToDeg(euler.z).toFixed(
                                2,
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      {/* {roomsArray.length > 0 &&
        roomsArray.map((room, i) => {
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
        })} */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={() => {
            setNewRooms([]);
            // setRooms([]);
          }}
        >
          전체삭제
        </button>
        {/* <button onClick={createRoom}>방 추가</button> */}
        <button onClick={newCreateRoom}>새로운방 추가</button>
        <button
          onClick={() => {
            uploadRooms();
          }}
        >
          업로드
        </button>
        <button
          onClick={() => {
            if (filterOcclusion) {
              downloadJsonFile(filterOcclusion, 'occlusion-data.json');
            } else {
              console.error('no filterOcclusion');
            }
          }}
        >
          pc에 저장
        </button>
        <button
          onClick={() => {
            loadRooms().then(res => {
              setNewRooms(res);
              // setRooms(res);
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
