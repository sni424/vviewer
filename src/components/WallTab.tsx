import { useAtom, useAtomValue } from 'jotai';
import { ProbeAtom, wallAtom } from '../scripts/atoms';
import { colorNumberToCSS, createWallFromPoints } from '../scripts/utils';

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
      <div className="w-full grid-cols-2">
        {/* 왼쪽 메뉴 - 점 관리 */}
        <section>
          <ul>
            {points.map((pointView, i) => {
              const { id, point, color, show } = pointView;

              return (
                <li key={`panel-point-${id}`} className="flex items-center">
                  <div>{i + 1}.</div>
                  <div
                    className="w-3 h-3"
                    style={{ background: colorNumberToCSS(color!) }}
                  ></div>
                </li>
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
        <div></div>
        {/* 오른쪽 메뉴 - 선 관리 */}
        <div></div>
      </div>
    </div>
  );
}

export default WallTab;
