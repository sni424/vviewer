import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';
import { v4 } from 'uuid';
import { __UNDEFINED__ } from '../Constants';
import {
  getAtomValue,
  ProbeAtom,
  setWallAtom,
  setWallHighlightAtom,
  setWallOptionAtom,
  wallHighlightAtom,
  wallOptionAtom,
} from '../scripts/atoms';
import {
  loadJson,
  uploadJson,
  wallOptionToWalls,
  wallsToWallOption,
} from '../scripts/atomUtils';
import {
  colorNumberToCSS,
  createWallFromPoints,
  getWallPoint,
  resetColor,
} from '../scripts/utils';
import { THREE } from '../scripts/VTHREE';
import { WallCreateOption, WallPointView, Walls, WallView } from '../types';

function WallDetail({
  wallView,
  i,
  walls,
  points,
}: {
  wallView: WallView;
  i: number;
  walls: WallView[];
  points: WallPointView[];
}) {
  const {
    id,
    start: _start,
    end: _end,
    color,
    show,
    probeId,
    probeName,
  } = wallView;
  const highlighted =
    useAtomValue(wallHighlightAtom).wallHighlights.includes(id);
  const probes = useAtomValue(ProbeAtom);

  return (
    <li
      className="flex items-center m-0 p-0 box-border h-10"
      onMouseEnter={() => {
        console.log(id);
        setWallHighlightAtom(prev => ({
          ...prev,
          wallHighlights: [id],
        }));
      }}
      onMouseLeave={() => {
        setWallHighlightAtom(prev => ({
          ...prev,
          wallHighlights: [],
        }));
      }}
      style={{
        border: highlighted ? '1px solid black' : undefined,
        // backgroundColor: highlighted ? 'yellow' : undefined,
      }}
    >
      <div>{i + 1}.</div>
      <div
        className="w-3 h-3"
        style={{ background: colorNumberToCSS(color!) }}
      ></div>
      <select
        value={probeId ?? __UNDEFINED__}
        onChange={e => {
          setWallOptionAtom(prev => {
            const copied = { ...prev };
            const copiedWalls = [...copied.walls];
            copiedWalls[i].probeId =
              e.target.value === __UNDEFINED__ ? undefined : e.target.value;
            copiedWalls[i].probeName = probes
              .find(p => p.getId() === e.target.value)
              ?.getName();
            copied.walls = copiedWalls;
            return copied;
          });
        }}
      >
        <option value={__UNDEFINED__}>프로브없음</option>
        {probes.map(probe => (
          <option
            key={`wall-probe-select-${id}-${probe.getId()}`}
            value={probe.getId()}
          >
            {probe.getName()}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          setWallOptionAtom(prev => {
            const copied = { ...prev };
            copied.walls = copied.walls.filter(w => w.id !== id);
            // resetColor(copied.walls);
            return copied;
          });
        }}
      >
        삭제
      </button>
    </li>
  );
}

function WallPointDetail({
  pointView,
  i,
  points,
  connectWallOnPointDelete,
  wallInfo,
}: {
  pointView: WallPointView;
  i: number;
  points: WallPointView[];
  connectWallOnPointDelete: boolean;
  wallInfo: WallCreateOption;
}) {
  const { id, point, color, show } = pointView;
  const highlighted =
    useAtomValue(wallHighlightAtom).pointHighlights.includes(id);

  return (
    <li
      // key={`panel-point-${id}`}
      className="flex flex-col items-center m-0 p-0 box-border h-10"
      onMouseEnter={() => {
        console.log(id);
        setWallHighlightAtom(prev => ({
          ...prev,
          pointHighlights: [id],
        }));
      }}
      onMouseLeave={() => {
        setWallHighlightAtom(prev => ({
          ...prev,
          pointHighlights: [],
        }));
      }}
      style={{
        border: highlighted ? '1px solid black' : undefined,
        // backgroundColor: highlighted ? 'yellow' : undefined,
      }}
    >
      <div className="flex w-full justify-between">
        <div className="flex items-center gap-2">
          <div>{i + 1}.</div>
          <div
            className="w-3 h-3"
            style={{ background: colorNumberToCSS(color!) }}
          ></div>
        </div>

        <div className="flex gap-0.5">
          <button
            onClick={() => {
              if (connectWallOnPointDelete) {
                setWallOptionAtom(prev => {
                  const copied = { ...prev };
                  copied.points = copied.points.filter(p => p.id !== id);
                  copied.walls = createWallFromPoints(
                    copied.points,
                    getAtomValue(ProbeAtom),
                  );
                  return copied;
                });
              } else {
                setWallOptionAtom(prev => {
                  const copied = { ...prev };

                  copied.points = copied.points.filter(p => p.id !== id);
                  copied.walls = copied.walls.filter(
                    w => w.start !== id && w.end !== id,
                  );

                  return copied;
                });
              }
            }}
          >
            삭제
          </button>
          <button
            onClick={() => {
              const myIndex = points.findIndex(p => p.id === id);
              const wallCandidate = wallInfo.walls.find(w => w.end === id);
              if (wallCandidate) {
                // 중간점
                const wallStart = getWallPoint(wallCandidate.start, points)!;
                const newPoint: WallPointView = {
                  id: v4(),
                  point: new THREE.Vector2(
                    (point.x + wallStart.point.x) / 2,
                    (point.y + wallStart.point.y) / 2,
                  ),
                  show: true,
                };
                setWallOptionAtom(prev => {
                  const copied = { ...prev };
                  const copiedPoints = [...copied.points];
                  copiedPoints.splice(myIndex, 0, newPoint);
                  copied.points = copiedPoints;
                  resetColor(copied.points);

                  copied.walls = createWallFromPoints(
                    copied.points,
                    getAtomValue(ProbeAtom),
                  );
                  return copied;
                });
              } else {
                setWallOptionAtom(prev => {
                  const copied = { ...prev };
                  const newPoint: WallPointView = {
                    id: v4(),
                    point: new THREE.Vector2(point.x + 0.1, point.y),
                  };
                  const copiedPoints = [...copied.points];
                  copiedPoints.splice(myIndex, 0, newPoint);
                  copied.points = copiedPoints;
                  resetColor(copied.points);

                  copied.walls = createWallFromPoints(
                    copied.points,
                    getAtomValue(ProbeAtom),
                  );

                  return copied;
                });
              }
            }}
          >
            위에 추가
          </button>
          <button
            onClick={() => {
              setWallOptionAtom(prev => ({
                ...prev,
                creating: {
                  cmd: 'adjust',
                  id,
                },
              }));
            }}
          >
            위치찍기
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2">
        <div className="flex items-center gap-2">
          x:
          <input
            className="inline-block flex-1 min-w-0 border rounded px-2"
            type="number"
            value={point.x.toFixed(3)}
            step={0.01}
            onChange={e => {
              setWallOptionAtom(prev => {
                const copied = { ...prev };
                const copiedPoints = [...copied.points];
                copiedPoints[i].point.x = parseFloat(e.target.value);
                copied.points = copiedPoints;
                copied.walls = createWallFromPoints(
                  copied.points,
                  getAtomValue(ProbeAtom),
                );
                return copied;
              });
            }}
          ></input>
        </div>
        <div className="flex items-center gap-2">
          z:
          <input
            type="number"
            className="inline-block flex-1 min-w-0 border rounded px-2"
            value={point.y.toFixed(3)}
            step={0.01}
            onChange={e => {
              setWallOptionAtom(prev => {
                const copied = { ...prev };
                const copiedPoints = [...copied.points];
                copiedPoints[i].point.y = parseFloat(e.target.value);
                copied.points = copiedPoints;
                copied.walls = createWallFromPoints(
                  copied.points,
                  getAtomValue(ProbeAtom),
                );
                return copied;
              });
            }}
          ></input>
        </div>
      </div>
    </li>
  );
}

function WallTab() {
  const [wallOption, setWalls] = useAtom(wallOptionAtom);
  const probes = useAtomValue(ProbeAtom);
  const [connectWallOnPointDelete, setConnectWallOnPointDelete] =
    useState(true);
  const [wallJsonName, setWallJsonName] = useState('walls.json');

  const { points, walls, creating, autoCreateWall } = wallOption;

  const onWallJsonLoad: React.FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();
    const proceed = confirm(`"${wallJsonName}"에  업로드하시겠습니까?`);
    if (!proceed) {
      return;
    }

    uploadJson(wallJsonName, wallOptionToWalls(wallOption)).then(() => {
      alert('업로드 완료');
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      {/* 상단 메뉴 */}
      <div className="flex flex-col border-b-black mb-2">
        <h2>벽 관련</h2>
        <div className="flex items-center gap-3 mb-2">
          <div>
            <input
              type="checkbox"
              checked={autoCreateWall}
              onChange={e => {
                setWalls((prev: WallCreateOption) => ({
                  ...prev,
                  autoCreateWall: e.target.checked,
                }));
              }}
            />
            <label>벽 자동 생성</label>
          </div>
          <div>
            <button
              onClick={() => {
                const createdWalls = createWallFromPoints(points, probes);

                setWalls((prev: WallCreateOption) => ({
                  ...prev,
                  walls: createdWalls,
                }));
              }}
            >
              벽 일괄생성
            </button>
          </div>
          <div>
            <button
              onClick={() => {
                const walls = wallOptionToWalls(wallOption);

                // walls.json으로 저장
                const a = document.createElement('a');
                const file = new Blob([JSON.stringify(walls)], {
                  type: 'application/json',
                }); // Blob 생성
                a.href = URL.createObjectURL(file);
                a.download = 'walls.json'; // 다운로드할 파일명
                a.click();
              }}
            >
              PC에 저장하기
            </button>
          </div>
          <div>
            <button
              onClick={() => {
                setWallAtom(wallOptionToWalls(wallOption, probes));
              }}
            >
              프로브에 적용하기
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <form onSubmit={onWallJsonLoad}>
            <input
              type="text"
              value={wallJsonName}
              onChange={e => {
                setWallJsonName(e.target.value.trim());
              }}
            ></input>
            <button type="submit">업로드</button>
            <button
              type="button"
              onClick={() => {
                loadJson<Walls>(wallJsonName).then(walls => {
                  setWallAtom(walls);
                  setWallOptionAtom(wallsToWallOption(walls));
                });
              }}
            >
              불러오기
            </button>
          </form>
        </div>
        <h2>포인트 관련</h2>
        <div className="flex flex-col justify-center">
          <div>
            <input
              type="radio"
              name="select-point-delete"
              checked={connectWallOnPointDelete}
              onChange={() => setConnectWallOnPointDelete(true)}
            ></input>
            <label onClick={() => setConnectWallOnPointDelete(true)}>
              포인트 삭제 시 벽 잇기
            </label>
          </div>
          <div>
            <input
              type="radio"
              name="select-point-delete"
              checked={!connectWallOnPointDelete}
              onChange={() => setConnectWallOnPointDelete(false)}
            ></input>
            <label onClick={() => setConnectWallOnPointDelete(false)}>
              포인트 삭제 시 벽 연결 끊음
            </label>
          </div>
        </div>
      </div>
      <div className="w-full grid grid-cols-2">
        {/* 왼쪽 메뉴 - 점 관리 */}
        <section>
          <h2 className="text-center mb-2 font-bold">포인트</h2>
          <ul>
            {points.map((pointView, i) => {
              const { id } = pointView;
              return (
                <WallPointDetail
                  pointView={pointView}
                  i={i}
                  points={points}
                  key={`panel-point-${id}`}
                  connectWallOnPointDelete={connectWallOnPointDelete}
                  wallInfo={wallOption}
                />
              );
            })}
          </ul>

          <div className="w-full flex gap-2">
            <button
              onClick={() => {
                setWalls((prev: WallCreateOption) => ({
                  ...prev,
                  creating: wallOption.creating
                    ? undefined
                    : {
                        cmd: 'end',
                      },
                }));
              }}
              style={{
                background: wallOption.creating ? 'yellow' : undefined,
              }}
            >
              {wallOption.creating ? '생성 중단' : '포인트 생성'}
            </button>
            <button
              onClick={() => {
                setWalls(
                  (prev: WallCreateOption) =>
                    ({
                      ...prev,
                      points: [],
                      walls: [],
                      creating: undefined,
                    }) as WallCreateOption,
                );
              }}
            >
              전체 삭제
            </button>
          </div>
        </section>
        {/* 오른쪽 메뉴 - 선 관리 */}
        <section>
          <div>
            <h2 className="text-center mb-2 font-bold">벽 (포인트-포인트)</h2>
            <ul>
              {walls.map((wallView, i) => {
                const { id } = wallView;

                return (
                  <WallDetail
                    wallView={wallView}
                    i={i}
                    walls={walls}
                    points={points}
                    key={`panel-wall-${id}`}
                  />
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

export default WallTab;
