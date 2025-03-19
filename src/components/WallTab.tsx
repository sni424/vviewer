import { useAtom, useAtomValue } from 'jotai';
import {
  ProbeAtom,
  setWallHighlightAtom,
  wallAtom,
  wallHighlightAtom,
  WallPointView,
  WallView,
} from '../scripts/atoms';
import { colorNumberToCSS, createWallFromPoints } from '../scripts/utils';

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

  return (
    <li
      className="flex items-center m-0 p-0 box-border"
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
      {probeName && <div>프로브 :{probeName}</div>}
    </li>
  );
}

function WallPointDetail({
  pointView,
  i,
  points,
}: {
  pointView: WallPointView;
  i: number;
  points: WallPointView[];
}) {
  const { id, point, color, show } = pointView;
  const highlighted =
    useAtomValue(wallHighlightAtom).pointHighlights.includes(id);

  return (
    <li
      // key={`panel-point-${id}`}
      className="flex items-center m-0 p-0 box-border"
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
      <div>{i + 1}.</div>
      <div
        className="w-3 h-3"
        style={{ background: colorNumberToCSS(color!) }}
      ></div>
    </li>
  );
}

function WallTab() {
  const [wallCreateOption, setWalls] = useAtom(wallAtom);
  const probes = useAtomValue(ProbeAtom);

  const { points, walls, creating, autoCreateWall } = wallCreateOption;

  return (
    <div className="w-full h-full overflow-y-auto">
      {/* 상단 메뉴 */}
      <div>
        <div>
          <input
            type="checkbox"
            checked={autoCreateWall}
            onChange={e => {
              setWalls(prev => ({ ...prev, autoCreateWall: e.target.checked }));
            }}
          />
          <label>벽 자동 생성</label>
        </div>
        <div>
          <button
            onClick={() => {
              const createdWalls = createWallFromPoints(points, probes);

              setWalls(prev => ({
                ...prev,
                walls: createdWalls,
              }));
            }}
          >
            벽 일괄생성
          </button>
        </div>
      </div>
      <div className="w-full grid grid-cols-2">
        {/* 왼쪽 메뉴 - 점 관리 */}
        <section>
          <ul>
            {points.map((pointView, i) => {
              const { id } = pointView;
              return (
                <WallPointDetail
                  pointView={pointView}
                  i={i}
                  points={points}
                  key={`panel-point-${id}`}
                />
              );
            })}
          </ul>

          <div>
            <button
              onClick={() => {
                setWalls(prev => ({
                  ...prev,
                  creating: {
                    cmd: 'end',
                  },
                }));
              }}
              style={{
                background: wallCreateOption.creating ? 'yellow' : undefined,
              }}
            >
              {wallCreateOption.creating ? '생성 중단' : '포인트 생성'}
            </button>
          </div>
        </section>
        {/* 오른쪽 메뉴 - 선 관리 */}
        <section>
          <div>
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
