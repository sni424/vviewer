import { useAtom, useAtomValue } from 'jotai';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { EnvController } from 'src/components/mobile/MobileControlPanel.tsx';
import {
  AnisotropyControl,
  GeneralPostProcessingControl,
  TestControl,
} from 'src/components/SceneInfo';
import { Layer } from 'src/Constants.ts';
import { MaxFile, maxFileAtom, MaxFileType } from 'src/pages/max/maxAtoms.ts';
import useMaxFileController from 'src/pages/max/UseMaxFileController.ts';
import { threeExportsAtom } from 'src/scripts/atoms.ts';
import { recompileAsync } from 'src/scripts/atomUtils.ts';
import * as THREE from 'VTHREE';
import { downloadBinary, downloadJson } from './loaders/MaxUtils';
import VRGLoader from './loaders/VRGLoader';
import VRILoader from './loaders/VRILoader';
import VRMLoader from './loaders/VRMLoader';
import VROLoader from './loaders/VROLoader';
import VRTLoader from './loaders/VRTLoader';

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
  const [lightMapIntensity, setLightMapIntensity] = useState<number>(1);
  const { handleMaxFile } = useMaxFileController();
  const [_, render] = useState(0);
  const [meshes, setMeshes] = useState<{ name: string; mesh: THREE.Mesh }[]>(
    [],
  );
  const [reflectMode, setReflectMode] = useState<boolean>(false);
  const threeExports = useAtomValue(threeExportsAtom);

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

  useEffect(() => {
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          mat.lightMapIntensity = lightMapIntensity;
        }
      });
    }
  }, [lightMapIntensity]);

  const meshRef = useRef<{ name: string; mesh: THREE.Mesh }[]>([]);

  async function load(maxFile: MaxFile) {
    return handleMaxFile(maxFile).then(() => {
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
        // meshRef.current.push({ name: originalFile.name, mesh: mesh });
      } else if (type === 'object') {
        resultData.layers.enable(Layer.Model);
        setMeshes(pre => [
          ...pre,
          { name: originalFile.name, mesh: resultData },
        ]);
        // meshRef.current.push({ name: originalFile.name, mesh: resultData });
      }
      // rerender();
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

  function loadRemote() {
    const projectName = 'max_test';
    const projectPath = `${projectName}/${projectName}`;

    const start = performance.now();
    type ProjectInfo = {
      name: string;
      json_uploaded: string[];
      binary_uploaded: string[];
    };
    const startAll = performance.now();
    downloadJson<ProjectInfo>(projectName, projectName).then(async json => {
      const {
        name,
        json_uploaded: jsonFiles,
        binary_uploaded: binaryFiles,
      } = json;

      const jsonProms: Promise<[string, any][]> = Promise.all(
        jsonFiles.map((filename: string) =>
          downloadJson(projectName, filename).then(
            res => [filename, res] as [string, any],
          ),
        ),
      );
      const binaryProms: Promise<[string, ArrayBuffer][]> = Promise.all(
        binaryFiles.map((filename: string) =>
          downloadBinary(projectName, filename).then(
            res => [filename, res] as [string, ArrayBuffer],
          ),
        ),
      );
      await Promise.all([jsonProms, binaryProms]);
      const jsons = await jsonProms;
      const binaries = await binaryProms;
      const end = performance.now();
      console.log('다운로드 완료 : ' + (end - start) + 'ms');
      console.log('jsonFiles', await jsons);
      console.log('binaryFiles', await binaries);

      const images = binaries.filter(arr => arr[0].endsWith('.vri'));
      const geometries = binaries.filter(arr => arr[0].endsWith('.vrg'));
      const textures = jsons.filter(json => json[0].endsWith('.vrt'));
      const materials = jsons.filter(json => json[0].endsWith('.vrm'));
      const objects = jsons.filter(json => json[0].endsWith('.vro'));

      console.log({
        textures,
        materials,
        objects,
        geometries,
        images,
      });

      const loadGeometry = () => {
        const geoLoader = new VRGLoader();
        const geoLoadStart = performance.now();
        return Promise.all(
          geometries.map(
            geo =>
              geoLoader.load({
                loaded: false,
                type: 'geometry',
                originalFile: geo[1],
                fileName: geo[0],
              }),
            // .then(geo => console.log({ geo })),
          ),
        ).then(res => {
          const geoLoadEnd = performance.now();
          console.log(
            'geometry 로드 완료 : ' + (geoLoadEnd - geoLoadStart) + 'ms',
          );
          console.log({ res });
        });
      };

      const loadImages = () => {
        const imgLoader = new VRILoader();
        const imgLoadStart = performance.now();
        return Promise.all(
          images.map(
            img => imgLoader.loadFromBuffer(img[1], img[0]),
            // .then(img => console.log({ img })),
          ),
        ).then(res => {
          const imgLoadEnd = performance.now();
          console.log(
            'image 로드 완료 : ' + (imgLoadEnd - imgLoadStart) + 'ms',
          );
          console.log({ res });
        });
      };

      const loadTextures = () => {
        const texLoader = new VRTLoader();
        const texLoadStart = performance.now();
        return Promise.all(
          textures.map(
            tex =>
              texLoader.load({
                loaded: false,
                type: 'texture',
                originalFile: tex[1],
                fileName: tex[0],
              }),
            // .then(tex => console.log({ tex })),
          ),
        ).then(res => {
          const texLoadEnd = performance.now();
          console.log(
            'texture 로드 완료 : ' + (texLoadEnd - texLoadStart) + 'ms',
          );
          console.log({ res });
        });
      };

      const loadMaterials = () => {
        const matLoader = new VRMLoader();
        const matLoadStart = performance.now();
        return Promise.all(
          materials.map(
            mat =>
              matLoader.load({
                loaded: false,
                type: 'material',
                originalFile: mat[1],
                fileName: mat[0],
              }),
            // .then(mat => console.log({ mat })),
          ),
        ).then(res => {
          const matLoadEnd = performance.now();
          console.log(
            'material 로드 완료 : ' + (matLoadEnd - matLoadStart) + 'ms',
          );
          console.log({ res });
        });
      };

      const loadObjects = () => {
        const objLoader = new VROLoader();
        const objLoadStart = performance.now();
        return Promise.all(
          objects.map(obj =>
            objLoader
              .load({
                loaded: false,
                type: 'object',
                originalFile: obj[1],
                fileName: obj[0],
              })
              .then(obj => {
                console.log({ obj });
                scene?.add(obj);
                obj.layers.enable(Layer.Model);
              }),
          ),
        ).then(res => {
          const objLoadEnd = performance.now();
          console.log(
            'object 로드 완료 : ' + (objLoadEnd - objLoadStart) + 'ms',
          );
          console.log({ res });
        });
      };

      const allLoadStart = performance.now();
      Promise.all([loadGeometry(), loadImages()])
        .then(() => loadTextures())
        .then(() => loadMaterials())
        .then(() => loadObjects())
        .then(o => {
          const allLoadEnd = performance.now();
          console.log('모두 로드 완료 : ' + (allLoadEnd - allLoadStart) + 'ms');

          console.log('처음부터 : ', allLoadEnd - startAll, 'ms');
        });
    });
  }

  function loadAll() {
    const start = performance.now();
    Promise.all(files.filter(f => !f.loaded).map(f => load(f))).finally(() => {
      const end = performance.now();
      // setMeshes([...meshRef.current]);

      alert('모두 로드 완료 : ' + (end - start) + 'ms');
    });
    // const start = performance.now();
    // const proms: Promise<any>[] = [];
    // files.forEach(f => {
    //   if (!f.loaded) {
    //     proms.push(load(f));
    //   }
    // });
    // Promise.all(proms).finally(() => {
    //   const end = performance.now();
    //   // setMeshes([...meshRef.current]);
    //   alert('모두 로드 완료 : ' + (end - start) + 'ms');
    // });
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

  function allColorOriginal() {
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          if (!mat.vUserData.isMultiMaterial && mat.vUserData.originalColor) {
            mat.color = new THREE.Color(`#${mat.vUserData.originalColor}`);
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

          const liveKeys = ['map', 'lightMap'];
          mapKeys.forEach(key => {
            if (!liveKeys.includes(key) && (mat as any)[key] !== null) {
              if (!mat.vUserData.tempMaps) mat.vUserData.tempMaps = {};
              mat.vUserData.tempMaps[key] = (mat as any)[key] as THREE.Texture;
              (mat as any)[key] = null;
            }
          });
          mat.needsUpdate = true;
        }
      });
    }
  }

  function showAllMaps() {
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          const tempMaps = mat.vUserData.tempMaps;
          if (tempMaps) {
            Object.keys(tempMaps).forEach(key => {
              (mat as any)[key] = tempMaps[key];
            });
          }
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
          });
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
        className="absolute w-[25%] overflow-y-auto top-0 h-full z-50 bg-[#ffffff] transition-all border-l border-l-gray"
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
              <button onClick={loadAll}>모두 로드</button>
              <button onClick={addAll}>geometry 전체 추가</button>
              <button onClick={loadRemote}>원격 로드</button>
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
              <div className="flex gap-x-1 border-b grid-cols-3 border-gray-400 p-1 border-x">
                <button onClick={allMaterialDefaultReflect}>
                  input Reflect
                </button>
                <button onClick={revertOriginalReflect}>
                  original Reflect
                </button>
                <button onClick={allColorWhite}>color White</button>
                <button onClick={allColorOriginal}>color Original</button>
                <button onClick={showOnlyDiffuse}>only diffuse</button>
                <button onClick={showAllMaps}>all maps</button>
                <button onClick={hasDiffuseElse}>debug</button>
                <button onClick={recompileAsync}>리컴파일</button>
              </div>
              <div className="w-full flex flex-col gap-x-1 p-1">
                <div className="flex gap-x-0.5 text-sm">
                  <strong className="text-sm">Metalness</strong>
                  <input
                    type="range"
                    disabled={!reflectMode}
                    min={0}
                    max={1}
                    step={0.01}
                    value={metalness}
                    onChange={e => {
                      setMetalness(parseFloat(e.target.value));
                    }}
                  />
                  <input
                    type="number"
                    disabled={!reflectMode}
                    min={0}
                    max={1}
                    step={0.01}
                    value={metalness}
                    onChange={e => {
                      setMetalness(parseFloat(e.target.value));
                    }}
                  />
                </div>
                <div className="flex gap-x-0.5 text-sm">
                  <strong className="text-sm">roughness</strong>
                  <input
                    type="range"
                    disabled={!reflectMode}
                    min={0}
                    max={1}
                    step={0.01}
                    value={roughness}
                    onChange={e => {
                      setRoughness(parseFloat(e.target.value));
                    }}
                  />
                  <input
                    type="number"
                    disabled={!reflectMode}
                    min={0}
                    max={1}
                    step={0.01}
                    value={roughness}
                    onChange={e => {
                      setRoughness(parseFloat(e.target.value));
                    }}
                  />
                </div>
                <div className="flex gap-x-0.5 text-sm">
                  <strong className="text-sm">lmIntensity</strong>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.01}
                    value={lightMapIntensity}
                    onChange={e => {
                      setLightMapIntensity(parseFloat(e.target.value));
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.01}
                    value={lightMapIntensity}
                    onChange={e => {
                      setLightMapIntensity(parseFloat(e.target.value));
                    }}
                  />
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
          {threeExports && (
            <section className="text-sm px-1">
              <TestControl />
              <AnisotropyControl></AnisotropyControl>
              <GeneralPostProcessingControl></GeneralPostProcessingControl>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default MaxPageRightBar;
