import {
  Dispatch,
  RefObject,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
import { useAtom } from 'jotai';
import { MaxFile, maxFileAtom, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import useMaxFileController from 'src/pages/max/UseMaxFileController.ts';
import * as THREE from 'VTHREE';
import { EnvController } from 'src/components/mobile/MobileControlPanel.tsx';

const MaxPageRightBar = ({
  expanded,
  setExpanded,
  scene,
}: {
  expanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  scene?: THREE.Scene;
}) => {
  const [files, setFiles] = useAtom(maxFileAtom);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [metalness, setMetalness] = useState<number>(0);
  const [roughness, setRoughness] = useState<number>(1);
  const { handleMaxFile } = useMaxFileController();
  const [_, render] = useState(0);
  const [meshes, setMeshes] = useState<{ name: string; mesh: THREE.Mesh }[]>(
    [],
  );
  const [reflectMode, setReflectMode] = useState<boolean>(false);

  function rerender() {
    render(pre => pre + 1);
  }

  const materials = files.filter(file => {
    return file.type === 'material' && file.loaded;
  });

  useEffect(() => {
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          mat.wireframe = wireframe;
        }
      });
    }
  }, [wireframe]);

  useEffect(() => {
    if (reflectMode) {
      if (scene) {
        scene.traverseAll(o => {
          if (o.type === 'Mesh') {
            const mat = (o as THREE.Mesh).matPhysical;
            mat.roughness = roughness;
            mat.metalness = metalness;
          }
        });
      }
    }
  }, [reflectMode, metalness, roughness]);

  async function load(maxFile: MaxFile) {
    handleMaxFile(maxFile).then(() => {
      const { originalFile, type, resultData } = maxFile;
      if (type === 'geometry') {
        const mesh = new THREE.Mesh();

        mesh.scale.set(0.001, 0.001, 0.001);
        mesh.name = originalFile.name;
        mesh.position.set(0, 0, 0);
        mesh.geometry = resultData;
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('white'),
          metalness: 0.2,
          roughness: 1,
          side: THREE.DoubleSide,
        });
        setMeshes(pre => [...pre, { name: originalFile.name, mesh: mesh }]);
      } else if (type === 'object') {
        setMeshes(pre => [
          ...pre,
          { name: originalFile.name, mesh: resultData },
        ]);
      }
      rerender();
    });
  }

  function addAll() {
    if (scene) {
      scene.children.forEach(c => {
        c.removeFromParent();
      });

      meshes.forEach(m => {
        scene.add(m.mesh);
      });
    }
  }

  function loadAll() {
    files.forEach((file, index) => {
      if (!file.loaded) load(file);
    });
  }

  function addToScene(maxFile: MaxFile) {
    const { type, originalFile } = maxFile;
    if (sceneAddTypes.includes(type)) {
      const target = meshes.filter(m => m.name === originalFile.name)[0];
      console.log(target);
      if (target && scene) {
        scene.add(target.mesh);
        console.log('scene Added : ', target.mesh);
        console.log(scene);
      }
    } else {
      alert('Not valid');
      return;
    }
  }

  function allMaterialDefaultReflect() {
    setReflectMode(true);
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          mat.roughness = roughness;
          mat.metalness = metalness;
        }
      });
    }
  }

  function revertOriginalReflect() {
    setReflectMode(false);
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          mat.roughness = mat.vUserData.originalRoughness ?? 1;
          mat.metalness = mat.vUserData.originalMetalness ?? 0;
        }
      });
    }
  }

  function allColorWhite() {
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          if (!mat.vUserData.isMultiMaterial) {
            mat.color = new THREE.Color('white');
          }
        }
      });
    }
  }

  function showOnlyDiffuse() {
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          const mapKeys = Object.keys(mat).filter(key => {
            return key.toLowerCase().endsWith('map');
          });
          mapKeys.forEach(key => {
            if (key !== 'map' && mat[key] !== null) {
              mat[key] = null;
            }
          });
          mat.needsUpdate = true;
        }
      });
    }
  }

  function hasDiffuseElse() {
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          let isThisHasOtherMap = false;
          Object.entries(mat).forEach(([key, value]) => {
            if (key !== 'map' && key.toLowerCase().endsWith('map')) {
              if (value !== null) {
                isThisHasOtherMap = true;
              }
            }
          })
          if (isThisHasOtherMap) {
            console.log('other map found : ', mat);
          }
        }
      });
    }
  }

  const sceneAddTypes: MaxFileType[] = ['geometry', 'object'];

  return (
    <>
      {!expanded && (
        <button
          className="py-2 px-3.5 text-sm absolute right-2 top-2 rounded-3xl"
          onClick={() => setExpanded(true)}
        >
          {'<'}
        </button>
      )}
      <div
        className="absolute w-[25%] top-0 h-full z-50 bg-[#ffffff] transition-all border-l border-l-gray"
        style={{ right: expanded ? 0 : '-25%' }}
      >
        <div className="relative p-2">
          <div className="flex gap-x-1">
            <button
              className="border-none bg-transparent text-sm font-bold px-2"
              onClick={() => setExpanded(false)}
            >
              {'>'}
            </button>
            <button onClick={loadAll}>모두 로드</button>
            <button onClick={addAll}>geometry 전체 추가</button>
            <button
              onClick={() => {
                setWireframe(pre => !pre);
              }}
            >
              wireFrame {wireframe ? 'ON' : 'OFF'}
            </button>
          </div>
          <section className="p-1 my-1 text-sm">
            <div className="border-b border-gray-400 w-full p-1 flex gap-x-2 items-center">
              <strong className="text-sm">Files</strong>
              <span className="text-sm">
                {' '}
                {files.filter(f => f.loaded).length} / {files.length}개
              </span>
            </div>
            <div className="p-1 h-[300px] w-full max-h-[300px] overflow-y-auto">
              {files.map(maxFile => {
                const { originalFile, type, loaded } = maxFile;
                return (
                  <div className="text-sm my-1">
                    <p className="text-gray-500">{type}</p>
                    <span>{originalFile.name}</span>
                    <span
                      className="ml-1"
                      style={{ color: loaded ? 'blue' : 'red' }}
                    >
                      {loaded ? '로드 됨' : '로드 안됨'}
                    </span>
                    <button onClick={() => load(maxFile)}>로드</button>
                    {sceneAddTypes.includes(type) && loaded && (
                      <button onClick={() => addToScene(maxFile)}>
                        씬에 추가
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          <section className="p-1 my-1 text-sm">
            <div className="border-b border-gray-400 w-full p-1 flex gap-x-2 items-center">
              <strong className="text-sm">Materials</strong>
              <span className="text-sm">{materials.length}개</span>
            </div>
            <div>
              <div className="flex gap-x-1 border-b border-gray-400 p-1 border-x">
                <button onClick={allMaterialDefaultReflect}>
                  input Reflect
                </button>
                <button onClick={revertOriginalReflect}>
                  original Reflect
                </button>
                <button onClick={allColorWhite}>color White</button>
                <button onClick={showOnlyDiffuse}>only diffuse</button>
                <button onClick={hasDiffuseElse}>debug</button>
              </div>
              <div className="w-full flex flex-col gap-x-1 p-1">
                <div className="flex gap-x-0.5 text-sm">
                  <strong className="text-sm">Metalness</strong>
                  <input type="range" disabled={!reflectMode} min={0} max={1} step={0.01} value={metalness} onChange={(e) => {
                    setMetalness(parseFloat(e.target.value))
                  }}/>
                  <input type="number" disabled={!reflectMode} min={0} max={1} step={0.01} value={metalness} onChange={(e) => {
                    setMetalness(parseFloat(e.target.value))
                  }}/>
                </div>
                <div className="flex gap-x-0.5 text-sm">
                  <strong className="text-sm">roughness</strong>
                  <input type="range" disabled={!reflectMode} min={0} max={1} step={0.01} value={roughness} onChange={(e) => {
                    setRoughness(parseFloat(e.target.value))
                  }}/>
                  <input type="number" disabled={!reflectMode} min={0} max={1} step={0.01} value={roughness} onChange={(e) => {
                    setRoughness(parseFloat(e.target.value))
                  }}/>
                </div>
              </div>
            </div>

            <div className="p-1 h-[300px] w-full max-h-[300px] overflow-y-auto">
              {materials.map(maxFile => {
                const { originalFile, loaded, resultData } = maxFile;
                return (
                  <div className="text-sm my-1">
                    <span>{originalFile.name}</span>
                    <span
                      className="ml-1"
                      style={{ color: loaded ? 'blue' : 'red' }}
                    >
                      {loaded ? '로드 됨' : '로드 안됨'}
                    </span>
                    <button onClick={() => load(maxFile)}>로드</button>
                    <button
                      disabled={!loaded && !resultData}
                      onClick={() => {
                        console.log('scene', scene);
                        if (scene && loaded && resultData) {
                          const material = resultData;
                          scene.children.forEach(o => {
                            console.log(o);
                            if (o.type === 'Mesh') {
                              (o as THREE.Mesh).material = material;
                            }
                          });
                          material.needsUpdate = true;
                        }
                      }}
                    >
                      적용
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="text-sm px-1">
            <EnvController />
          </section>
        </div>
      </div>
    </>
  );
};

export default MaxPageRightBar;
