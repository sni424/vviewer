import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { THREE } from 'VTHREE';
import { Layer } from '../Constants.ts';
import {
  materialSelectedAtom,
  selectedAtom,
  threeExportsAtom,
  treeScrollToAtom,
  treeSearchAtom,
} from '../scripts/atoms';
import { isProbeMesh, isTransformControlOrChild } from '../scripts/utils.ts';

const MeshChildren = ({ data }: { data: THREE.Mesh }) => {
  const material = data.material as THREE.Material;
  const [mat, setMaterialSelected] = useAtom(materialSelectedAtom);

  return (
    <div
      style={{
        paddingLeft: 28,
        display: 'flex',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
      onClick={() => {
        setMaterialSelected(prev => {
          if (!prev) {
            return material;
          }
          if (prev.uuid === material.uuid) {
            return null;
          } else {
            return material;
          }
        });
      }}
    >
      <div
        style={{
          fontSize: 11,
          backgroundColor: mat?.uuid === material.uuid ? '#888' : undefined,
        }}
      >
        {material.name}
      </div>
      <div
        style={{
          fontSize: 10,
          color: '#555',
        }}
      >
        {material.type}
      </div>
    </div>
  );
};

export const RecursiveNode = ({
  data,
  depth = 0,
}: {
  data: THREE.Object3D;
  depth: number;
}) => {
  const [selecteds, setSelecteds] = useAtom(selectedAtom);
  const threeExports = useAtomValue(threeExportsAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTo, setScrollTo] = useAtom(treeScrollToAtom);
  const scrollToThis = Boolean(scrollTo) && scrollTo === data.uuid;
  const thisSelected = selecteds.includes(data.uuid);

  const [hidden, setHidden] = useState(data.visible ? false : true);
  const toggleHide = () => {
    if (threeExports) {
      setHidden(!hidden);
      data.visible = hidden;
      const { gl, scene, camera } = threeExports;
      gl.render(scene, camera);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('here', thisSelected);
    if (e.key.toLowerCase() === 'h') {
      // hide
      if (thisSelected) {
        toggleHide();
      }
    }
  };

  const type = data.type as
    | 'Scene'
    | 'Mesh'
    | 'Group'
    | 'Object3D'
    | 'BoxHelper';

  const [open, setOpen] = useState(
    ['Scene', 'Object3D', 'Group'].includes(type) ? true : false,
  );
  const openable = type === 'Group' || type === 'Object3D' || type === 'Mesh';

  useEffect(() => {
    if (!scrollTo || !containerRef.current) {
      return;
    }

    if (scrollTo === data.uuid) {
      // 뷰 안에 있으면 스크롤을 따로 하지 않는다
      if (
        containerRef.current.getBoundingClientRect().top < 0 ||
        containerRef.current.getBoundingClientRect().bottom > window.innerHeight
      ) {
        containerRef.current.scrollIntoView();
      }
    }

    // 한 번 스크롤하고 나면 초기화
    // setScrollTo(null);
  }, [scrollTo]);

  if (type === 'BoxHelper' || !threeExports) {
    return null;
  }

  if (!data.layers.isEnabled(Layer.Model)) {
    return null;
  }

  // 자식 중에 선택된 것이 있는지 확인
  // 비싼 재귀지만 개발단이니 진행
  const { scene } = threeExports;
  const isRoot = data.uuid === scene.uuid;
  const childSelected = (() => {
    if (isRoot) {
      // 최상단 scene은 패스
      return false;
    }
    if (thisSelected) {
      return false;
    }

    const object: THREE.Object3D | undefined = scene.getObjectByProperty(
      'uuid',
      data.uuid,
    );
    if (!object) {
      return false;
    }
    let retval = false;
    const recursivelyCheck = (object: THREE.Object3D) => {
      object.children.forEach(child => {
        if (retval) {
          return;
        }
        if (selecteds.includes(child.uuid)) {
          retval = true;
          return;
        }
        recursivelyCheck(child);
      });
    };
    recursivelyCheck(object);

    return retval;
  })();

  if (isProbeMesh(data) || isTransformControlOrChild(data)) {
    return null;
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      ref={containerRef}
      style={{
        width: '100%',
        paddingLeft: depth * 4,
        fontSize: 12,
        marginTop: 2,
        // border: childSelected ? '1px solid #3d3d3d' : undefined,
        backgroundColor: childSelected ? '#ccc' : undefined,
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          textAlign: 'center',
          backgroundColor: scrollToThis
            ? 'orange'
            : thisSelected
              ? '#aaa'
              : childSelected
                ? '#ccc'
                : undefined,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            justifyContent: 'start',
          }}
        >
          <div
            style={{
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              width: 16,
              height: 16,
              cursor: 'pointer',
              display: 'inline-block',
              textAlign: 'center',
            }}
            onClick={() => {
              if (openable) {
                setOpen(!open);
              }
            }}
          >
            &gt;
          </div>
          <div
            className="flex justify-start"
            style={{
              width: 'calc(100% - 16px)',
              color: data.name.length === 0 ? '#666' : '#000',
              cursor: 'pointer',
              // single line with ellipsis
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              textAlign: 'left',
            }}
            onClick={e => {
              if (e.ctrlKey) {
                if (selecteds.includes(data.uuid)) {
                  setSelecteds(selecteds.filter(uuid => uuid !== data.uuid));
                } else {
                  setSelecteds([...selecteds, data.uuid]);
                  setScrollTo(data.uuid);
                }
              } else {
                setSelecteds([data.uuid]);
                setScrollTo(data.uuid);
              }
            }}
          >
            {isRoot
              ? '장면 루트'
              : data.name.length === 0
                ? '<이름없음>'
                : data.name}
          </div>
        </div>

        <div style={{ fontSize: 10, color: '#555' }}>
          {data.type}
          <div
            style={{
              cursor: 'pointer',
              marginLeft: 4,
              width: 40,
              height: 16,
              border: '1px solid #999',
              backgroundColor: hidden ? '#bbb' : 'white',
              textAlign: 'center',
              display: 'inline-block',
            }}
            onClick={toggleHide}
          >
            {hidden ? '보이기' : '숨기기'}
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'end',
          flexDirection: 'column',
        }}
      >
        {open && data.type === 'Mesh' && (
          <MeshChildren data={data as THREE.Mesh}></MeshChildren>
        )}
        {open &&
          data.children.map((child, index) => {
            return (
              <RecursiveNode
                key={index}
                data={child}
                depth={depth + 1}
              ></RecursiveNode>
            );
          })}
      </div>
    </div>
  );
};

const SearchBar = () => {
  // const [value, setValue] = useAtom(treeSearchAtom);
  const [value, setValue] = useState('');
  const setTreeSearch = useSetAtom(treeSearchAtom);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(value);
    setTreeSearch(value);
  };
  return (
    <div
      style={{ width: '100%', padding: '0px 10px', boxSizing: 'border-box' }}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex' }}>
        <input
          style={{ flex: 1, minWidth: 0 }}
          type="text"
          value={value}
          onChange={e => {
            setValue(e.target.value);
          }}
        ></input>
        <button style={{ fontSize: 11 }} type="submit">
          검색
        </button>
        <button
          style={{ fontSize: 11 }}
          type="button"
          onClick={() => {
            setValue('');
            setTreeSearch(undefined);
          }}
        >
          초기화
        </button>
      </form>
    </div>
  );
};

const SearchResultList = ({
  data,
  label,
}: {
  data: (THREE.Object3D | THREE.Material)[];
  label: string;
}) => {
  const [selecteds, setSelecteds] = useAtom(selectedAtom);
  const [selectedMaterial, setSelectedMaterial] = useAtom(materialSelectedAtom);

  return (
    <div style={{ marginBottom: 12 }}>
      <strong>{label}</strong>
      {data.length > 0 ? (
        <ul>
          {data.map((obj, index) => {
            const thisSelected =
              selecteds.includes(obj.uuid) ||
              selectedMaterial?.uuid === obj.uuid;
            return (
              <li
                style={{
                  fontSize: 11,
                  cursor: 'pointer',
                  backgroundColor: thisSelected ? '#bbb' : undefined,
                }}
                key={'search-list-item-' + label.replace(' ', '-') + obj.uuid}
                onClick={e => {
                  if ((obj as { isMaterial?: boolean }).isMaterial) {
                    setSelectedMaterial(obj as THREE.Material);
                  } else {
                    if (e.ctrlKey) {
                      if (selecteds.includes(obj.uuid)) {
                        setSelecteds(
                          selecteds.filter(uuid => uuid !== obj.uuid),
                        );
                      } else {
                        setSelecteds([...selecteds, obj.uuid]);
                      }
                    } else {
                      setSelecteds([obj.uuid]);
                    }
                  }
                }}
              >
                {index + 1}.{' '}
                {obj.name.trim().length === 0 ? '<이름없음>' : obj.name}
              </li>
            );
          })}
        </ul>
      ) : (
        <div style={{ fontSize: 12, color: '#444' }}>결과 없음</div>
      )}
    </div>
  );
};

const toUnique = (arr: (THREE.Object3D | THREE.Material)[]) => {
  return arr.filter((v, i, a) => a.findIndex(t => t.uuid === v.uuid) === i);
};

const SearchResults = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const query = useAtomValue(treeSearchAtom)?.trim().toLowerCase();

  if (!threeExports || !query || query.length === 0) {
    return null;
  }

  const { scene } = threeExports;
  const types: THREE.Object3D[] = [];
  const names: THREE.Object3D[] = [];
  const ids: THREE.Object3D[] = [];
  const materials: THREE.Material[] = [];
  const meshesUsingMaterial: THREE.Object3D[] = [];

  scene.traverse(obj => {
    // 1. typeSearch
    if (query === obj.type.toLowerCase()) {
      types.push(obj);
    }

    // 2. id search
    if (obj.uuid.includes(query)) {
      ids.push(obj);
    }

    // 3. name search
    if (obj.name.toLowerCase().includes(query)) {
      names.push(obj);
    }

    // 4. material search
    if (obj.type === 'Mesh') {
      const material = (obj as THREE.Mesh).material as THREE.Material;
      if (material?.name.toLowerCase().includes(query)) {
        materials.push(material);
        meshesUsingMaterial.push(obj);
      }
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <SearchResultList
        data={toUnique(types)}
        label="타입 검색"
      ></SearchResultList>
      <SearchResultList
        data={toUnique(names)}
        label="이름 검색"
      ></SearchResultList>
      <SearchResultList data={toUnique(ids)} label="ID 검색"></SearchResultList>
      <SearchResultList
        data={toUnique(materials)}
        label="재질 검색"
      ></SearchResultList>
      <SearchResultList
        data={toUnique(meshesUsingMaterial)}
        label="메시 검색(재질사용)"
      ></SearchResultList>
    </div>
  );
};

const SceneTree = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const searchTree = useAtomValue(treeSearchAtom)?.trim().toLowerCase();
  const hasSearchQuery = searchTree && searchTree.length > 0;

  if (!threeExports) {
    return null;
  }

  const { scene } = threeExports;

  // return <ObjectViewer data={scene}></ObjectViewer>
  return (
    <div
      style={{ width: '100%', padding: 8, height: '100%', overflow: 'auto' }}
    >
      <SearchBar></SearchBar>
      {hasSearchQuery ? (
        <SearchResults></SearchResults>
      ) : (
        <RecursiveNode data={scene} depth={0} />
      )}
    </div>
  );
};

export default SceneTree;
