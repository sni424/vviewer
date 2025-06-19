import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { THREE } from 'VTHREE';
import {
  materialSelectedAtom,
  panelTabAtom,
  selectedAtom,
  threeExportsAtom,
  treeScrollToAtom,
  useModal,
} from '../scripts/atoms';
import { groupInfo } from '../scripts/utils';
import ApplyLightMapComponent from './ApplyLightMapComponent';

const MeshView = ({
  object,
  index,
}: {
  object: THREE.Object3D;
  index: number;
}) => {
  const info = groupInfo(object);
  const [selectedMaterial, setSelectedMaterial] = useAtom(materialSelectedAtom);
  const currentMat = (object as THREE.Mesh)?.material as THREE.Material;
  const isSelectedMaterialThisMesh =
    currentMat && selectedMaterial?.uuid === currentMat?.uuid;
  const setSelecteds = useSetAtom(selectedAtom);
  const setTab = useSetAtom(panelTabAtom);
  const [treeScrollTo, setTreeScrollTo] = useAtom(treeScrollToAtom);

  const thisOrange = treeScrollTo === object.uuid;

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
      key={'infodetail-' + object.uuid}
    >
      <div></div>
      <div className="flex w-full justify-between text-sm">
        <div
          className={`inline-block ${thisOrange ? 'bg-orange-600' : 'bg-yellow-500'} text-white`}
        >
          <div>
            {index + 1}.
            <span className={`underline`}>
              {object.name.length === 0 ? '이름없음' : object.name}
            </span>
          </div>
        </div>
        <div className={`inline-block`}>{object.type}</div>
      </div>
      {/* <div style={{ display: "grid" }}> */}
      <div>
        <button
          onClick={() => {
            setSelecteds([object.parent!.uuid]);
            setTreeScrollTo(object.parent!.uuid);
          }}
          disabled={!Boolean(object.parent)}
        >
          부모선택
        </button>
        <button
          onClick={() => {
            setSelecteds([object.uuid]);
          }}
        >
          단일선택
        </button>
        <button
          onClick={() => {
            setSelecteds(prev => prev.filter(uuid => uuid !== object.uuid));
          }}
        >
          제외
        </button>
        <button
          onClick={() => {
            setTab('tree');
            setTreeScrollTo(object.uuid);
          }}
        >
          트리에서 보기
        </button>
        <button onClick={() => console.log(object)}>debug</button>
        <button onClick={() => object.visible = !object.visible}>visible toggle</button>
        {currentMat && (
          <button
            onClick={() => {
              setSelectedMaterial(
                (object as THREE.Mesh).material as THREE.Material,
              );
            }}
            disabled={isSelectedMaterialThisMesh}
          >
            {isSelectedMaterialThisMesh ? '재질선택됨' : '재질'}
          </button>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          paddingLeft: 8,
        }}
      >
        <div style={{ fontSize: 10 }}>{object.uuid}</div>
        {Object.keys(object.vUserData).length > 0 && (
          <div style={{ fontSize: 11 }}>
            유저데이터
            <div style={{ fontSize: 10 }}>
              {Object.entries(object.vUserData as Record<string, any>).map(
                ([key, value]) => {
                  const ignoreKeys = ['probe', 'dpOnLightMap', 'dpOffLightMap'];
                  if (ignoreKeys.includes(key)) {
                    return null;
                  }

                  if (!value) {
                    return null;
                  }
                  return (
                    <div
                      style={{ paddingLeft: 8 }}
                      key={`info-${object.uuid}-${key}`}
                    >
                      {key}: {JSON.stringify(value).replace(/\"/g, '')}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        <div style={{ fontSize: 11 }}>
          {info.meshCount > 0 && <div>메쉬 {info.meshCount}개</div>}
          {info.triangleCount > 0 && <div>삼각형 {info.triangleCount}개</div>}
          {info.vertexCount > 0 && <div>버텍스 {info.vertexCount}개</div>}
        </div>
      </div>
    </div>
  );
};

function MeshInfoPanel() {
  const [selecteds, setSelecteds] = useAtom(selectedAtom);
  const threeExports = useAtomValue(threeExportsAtom);
  const materialSelected = useAtomValue(materialSelectedAtom);
  const { openModal, closeModal } = useModal();

  if (selecteds.length === 0 || !threeExports) {
    return null;
  }

  const { scene } = threeExports;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        maxHeight: materialSelected ? 'calc(50% - 20px)' : 'calc(100% - 20px)',
        width: 300,
        backgroundColor: '#bbbbbb99',
        padding: 8,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflowY: 'auto',
      }}
    >
      <div>{selecteds.length}개 선택됨</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
        }}
      >
        <button
          style={{ fontSize: 11 }}
          onClick={() => {
            openModal((<ApplyLightMapComponent />) as any);
          }}
        >
          {' '}
          맵 일괄적용
        </button>
        <button
          style={{ fontSize: 11 }}
          onClick={() => {
            setSelecteds(prev => {
              return prev.filter(uuid => {
                const found = scene.getObjectByProperty('uuid', uuid);
                if (!found) {
                  return false;
                }
                return found.type !== 'Mesh';
              });
            });
          }}
        >
          하위메시제외
        </button>
      </div>

      {selecteds.map((selected, index) => {
        const found = scene.getObjectByProperty('uuid', selected);
        if (!found) {
          return null;
        }
        return (
          <MeshView
            key={`info-object-${found.uuid}`}
            object={found}
            index={index}
          ></MeshView>
        );
      })}
      <div
        style={{
          position: 'absolute',
          top: 5,
          right: 5,
          fontSize: 12,
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
        onClick={() => {
          setSelecteds([]);
        }}
      >
        {' '}
        X
      </div>
    </div>
  );
}

export default MeshInfoPanel;
