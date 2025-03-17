import { useAtom } from 'jotai';
import { wallAtom } from '../scripts/atoms';

type Point = [number, number];

function WallTab() {
  const [walls, setWalls] = useAtom(wallAtom);

  const createWall = () => {
    setWalls(prev => {
      return [
        ...prev,
        {
          start: undefined as unknown as Point,
          end: undefined as unknown as Point,
          creating: true,
        },
      ];
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="p-2">
        <button
          onClick={() => {
            setWalls(prev => {
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
            setWalls(prev => {
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
      {walls.map((wall, i) => {
        const { start, end, probeName, creating, show } = wall;
        !!TODO : 벽 생성 진행하기
        return (
          <div
            className="mb-1 p-1 box-border"
            key={`wall-panel-${i}`}
            style={{
              backgroundColor: creating ? 'yellow' : undefined,
            }}
          >
            벽 {i + 1}.{(creating || !start || !end) && <div> 생성 중</div>}
          </div>
        );
      })}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={() => {
            setWalls([]);
          }}
        >
          전체삭제
        </button>
        <button onClick={createWall}>방 추가</button>
        {/* <button onClick={uploadRooms}>업로드</button> */}
        {/* <button
            onClick={() => {
              loadRooms().then(res => {
                setRooms(res);
              });
            }}
          >
            불러오기
          </button> */}
      </div>
    </div>
  );
}

export default WallTab;
