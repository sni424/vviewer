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
import { gsap } from 'gsap';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import VTextureLoader from 'src/scripts/loaders/VTextureLoader.ts';
import ReflectionProbe from 'src/scripts/ReflectionProbe.ts';

const VIZ4D_LIGHT_MAPS = [
  'c1_C01.exr',
  'c2_BAE.exr',
  'c3_C47.exr',
  'c4_3E9.exr',
  'c5_231.exr',
  'c6_ECC.exr',
  'c7_327.exr',
  'c8_DAE.exr',
  'msm1_439.exr',
  'msm2_5D2.exr',
  'msm3_26E.exr',
];
const VR_LIGHT_MAPS = [
  '59B_Wall_001_mID_2_VRayRawTotalLightingMap_denoised.hdr',
  '59B_Wall_002_VRayRawTotalLightingMap_denoised.hdr',
  '59B_Wall_004_mID_13_VRayRawTotalLightingMap_denoised.hdr',
  '59B_Wall_021_VRayRawTotalLightingMap_denoised.hdr',
  '59B_걸레받이_VRayRawTotalLightingMap_denoised.hdr',
  'Ceiling_Cap_top_VRayRawTotalLightingMap_denoised.hdr',
  'Circle079_VRayRawTotalLightingMap_denoised.hdr',
  'dp1_VRayRawTotalLightingMap_denoised.hdr',
  'dp2_VRayRawTotalLightingMap_denoised.hdr',
  'dp3_VRayRawTotalLightingMap_denoised.hdr',
  '주방_VRayRawTotalLightingMap_denoised.hdr',
];

const VR_0613_LIGHT_MAPS = [
  'q1_VRayRawTotalLightingMap_denoised.hdr',
  'q2_VRayRawTotalLightingMap_denoised.hdr',
  'q3_VRayRawTotalLightingMap_denoised.hdr',
  'q4_VRayRawTotalLightingMap_denoised.hdr',
  'q5_VRayRawTotalLightingMap_denoised.hdr',
];

const VR_0617_LIGHT_MAPS = [
  'dp1',
  'dp2',
  'layer1',
  'layer2',
  'layer3',
  'layer4',
];

const LIGHTMAP_SUFFIX = '_VRayRawTotalLightingMap_denoised.hdr';

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

  const [vizLightMaps, setVizLightMaps] = useState<{
    [key: string]: THREE.Texture;
  }>({});

  const [vrLightMaps, setVrLightMaps] = useState<{
    [key: string]: THREE.Texture;
  }>({});
  const [vrLightMapsLoaded, setVrLightMapsLoaded] = useState(false);
  const [lightMapsLoaded, setLightMapsLoaded] = useState(false);
  const [innerProbe, setInnerProbe] = useState<ReflectionProbe | null>(null);

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

  function geometryTest() {
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const geo = (o as THREE.Mesh).geometry;
          geo.computeVertexNormals();
          geo.computeBoundingBox();
          geo.computeBoundingSphere();
          geo.normalizeNormals();
        }
      });
    }
  }

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
        mesh.material.vUserData.isVMaterial = true;
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

          const liveKeys = ['map', 'lightMap', 'envMap'];
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

  function animateFOV(
    toFOV: number,
    camera: THREE.PerspectiveCamera,
    duration = 1,
  ) {
    gsap.to(camera, {
      fov: toFOV,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        camera.updateProjectionMatrix(); // 변경 사항 적용
      },
    });
  }

  function showLocalLightMapApplies() {
    if (scene) {
      const applies: { [key: string]: string } = {};
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          if (mat.lightMap && mat.vUserData.viz4dLightMap) {
            applies[mat.name] = mat.vUserData.viz4dLightMap;
          }
        }
      });

      console.log('applies', applies);
      const arr: string[] = [];
      Object.values(applies).forEach(value => {
        if (!arr.includes(value)) {
          arr.push(value);
        }
      });

      arr.sort();

      console.log('maps', arr);
    }
  }

  function exportLightMapOutputs() {
    if (scene) {
      const applies: { [key: string]: string } = {};
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          if (mat.lightMap && mat.vUserData.viz4dLightMap) {
            applies[mat.name] = mat.vUserData.viz4dLightMap;
          }
        }
      });

      console.log('applies', applies);
      saveJSON(applies);
    }
  }

  async function loadVRCustomLightMaps() {
    if (vrLightMapsLoaded) {
      alert('이미 불러왓슴');
      return;
    }
    const url = MaxConstants.base + 'lightmaps/';

    const textures: { [key: string]: THREE.Texture } = Object.fromEntries(
      await Promise.all(
        VR_0617_LIGHT_MAPS.map(async uri => {
          const tex = await VTextureLoader.loadAsync(
            url + uri + LIGHTMAP_SUFFIX,
            threeExports,
          );
          tex.flipY = uri.endsWith('hdr');
          tex.needsUpdate = true;
          return [uri, tex]; // [key, value] 형태로 반환
        }),
      ),
    );

    setVrLightMaps(textures);
    setVrLightMapsLoaded(true);
    alert('완료!');
  }

  async function loadCustomLightMaps() {
    if (lightMapsLoaded) {
      alert('이미 불러왓슴');
      return;
    }
    const url = MaxConstants.base + 'lightmaps/';

    const textures: { [key: string]: THREE.Texture } = Object.fromEntries(
      await Promise.all(
        VIZ4D_LIGHT_MAPS.map(async uri => {
          const tex = await VTextureLoader.loadAsync(url + uri, threeExports);
          tex.flipY = false;
          tex.needsUpdate = true;
          return [uri, tex]; // [key, value] 형태로 반환
        }),
      ),
    );

    setVizLightMaps(textures);
    setLightMapsLoaded(true);
    alert('완료!');
  }

  function importLightMapApplies() {
    if (!lightMapsLoaded) {
      alert('라이트맵을 먼저 불러오세요.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', event => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result as string;
          const data = JSON.parse(result);
          console.log('✅ JSON loaded:', data);

          const mats = Object.keys(data);
          // 여기서 data 를 활용하세요
          // applyLightMapData(data); 같은 식으로
          if (scene) {
            const applies: { [key: string]: string } = data;
            scene.traverseAll(o => {
              if (o.type === 'Mesh') {
                const mat = (o as THREE.Mesh).matPhysical;
                if (!mat.lightMap) {
                  if (mats.includes(mat.name)) {
                    const targetLightMap = vizLightMaps[data[mat.name]];
                    console.log(
                      'this lightmap ',
                      data[mat.name],
                      targetLightMap,
                    );
                    mat.lightMap = targetLightMap;
                    mat.vUserData.viz4dLightMap = data[mat.name];
                    mat.needsUpdate = true;
                  }
                }
              }
            });
          }
        } catch (e) {
          console.error('❌ JSON 파싱 오류:', e);
        }
      };
      reader.readAsText(file);
    });

    input.click(); // 파일 선택창 열기
  }

  function importVRLightMapApplies() {
    if (!vrLightMapsLoaded) {
      alert('라이트맵을 먼저 불러오세요.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', event => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result as string;
          const data = JSON.parse(result);
          console.log('✅ JSON loaded:', data);

          // 여기서 data 를 활용하세요
          // applyLightMapData(data); 같은 식으로
          if (scene) {
            const keys = Object.keys(data);
            scene.traverseAll(o => {
              if (o.type === 'Mesh') {
                const mesh = o as THREE.Mesh;
                // 이미 넣었으면 패스
                if (!mesh.matPhysical.lightMap) {
                  if (keys.includes(mesh.name)) {
                    const targetLightMapKey: string = data[mesh.name] as string;
                    if (targetLightMapKey.startsWith('fi_')) {
                      const key = extractQName(targetLightMapKey);
                      console.log(key, targetLightMapKey);
                      if (key) {
                        const mat = mesh.matPhysical;
                        mat.lightMap = vrLightMaps[key];
                        if (!mat.lightMap.flipY) {
                          mat.lightMap.flipY = true;
                        }
                        mat.vUserData.viz4dLightMap = key;
                        mat.needsUpdate = true;
                      }
                    }
                  } else if (keys.includes(stripMatSuffix(mesh.name))) {
                    const formattedKey = stripMatSuffix(mesh.name);
                    const targetLightMapKey: string = data[
                      formattedKey
                    ] as string;
                    if (targetLightMapKey.startsWith('fi_')) {
                      const key = extractQName(targetLightMapKey);
                      if (key) {
                        const mat = mesh.matPhysical;
                        mat.lightMap = vrLightMaps[key];
                        if (!mat.lightMap.flipY) {
                          mat.lightMap.flipY = true;
                        }
                        mat.vUserData.viz4dLightMap = key;
                        mat.needsUpdate = true;
                      }
                    }
                  }
                }
              }
            });
          }
        } catch (e) {
          console.error('❌ JSON 파싱 오류:', e);
        }
      };
      reader.readAsText(file);
    });

    input.click(); // 파일 선택창 열기
  }

  function stripMatSuffix(str: string) {
    return str.replace(/_mat_sub_\d+$/, '');
  }

  function extractQName(str: string) {
    const match = str.match(/fi_([a-z]+\d+)/i);
    return match ? match[1] : null;
  }

  function removeAllLightMaps() {
    if (scene) {
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          mat.lightMap = null;
          mat.vUserData.viz4dLightMap = null;
          mat.needsUpdate = true;
        }
      });
    }
  }

  function saveJSON(obj: any, filename = 'data.json') {
    const json = JSON.stringify(obj, null, 2); // 보기 좋게 들여쓰기 포함
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  function getMyCameraPosition() {
    if (threeExports) {
      const camera = threeExports.camera;
      const position = camera.matrix;

      alert('Camera position : ' + position.toArray());

      return position;
    } else {
      alert('camera not found');
      return null;
    }
  }

  function createProbe() {
    if (threeExports) {
      const { scene, gl, camera } = threeExports;
      // 먼저 기존 프로브 제거

      if (innerProbe) {
        innerProbe.removeFromScene();
        setInnerProbe(null);
      }

      const size = new THREE.Vector3(-14.7, 2.9, 11.04);
      const position = new THREE.Vector3(0.5, 1.09, -0.09);

      const probe = new ReflectionProbe(gl, scene, camera, 2048);
      probe.setControlsVisible(false);
      probe.getBoxMesh().visible = false;
      probe.setCenterAndSize(position, size);
      probe.addToScene(true);
      const texture = probe.getRenderTargetTexture();
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          // mat.prepareProbe({probeCount: 1, usePmrem:false})
          // mat.apply('probe', {probes: [probe]});
          mat.envMap = texture;
          mat.envMapIntensity = 0.3;
          mat.needsUpdate = true;
        }
      });

      setInnerProbe(probe);
    }
  }

  function removeProbe() {
    if (threeExports) {
      const { scene } = threeExports;
      const objsToRemove: THREE.Object3D[] = [];
      scene.traverseAll(o => {
        if (o.vUserData.isProbeMesh) {
          objsToRemove.push(o);
        }
        if (o.type === 'Mesh') {
          if (!o.vUserData.isProbeMesh) {
            const mat = (o as THREE.Mesh).matPhysical;
            mat.envMap = null;
            mat.needsUpdate = true;
          }
        }
      });

      objsToRemove.forEach(obj => {
        obj.removeFromParent();
      });
    }
  }

  function getNowProbePositionAndSize() {
    if (threeExports) {
      console.log(scene);
    }
  }

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
            <button onClick={getMyCameraPosition}>My position</button>
            <button onClick={createProbe}>probe test</button>
            <button onClick={removeProbe}>removeProbe</button>
            <button onClick={getNowProbePositionAndSize}>debug</button>
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
                <button onClick={geometryTest}>geo</button>
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
          <section className="text-sm px-1 flex flex-col my-1">
            <strong>viz4d lightMap</strong>
            <div className="flex gap-x-1 py-1">
              {/*<button onClick={showLocalLightMapApplies}>적용 정보 보기</button>*/}
              <button onClick={exportLightMapOutputs}>
                적용 정보 내보내기
              </button>
              <button onClick={importLightMapApplies}>
                Viz4d 용 적용 정보 가져오기
              </button>
              <button onClick={loadCustomLightMaps}>
                viz4d 라이트맵 불러오기
              </button>
              <button onClick={importVRLightMapApplies}>
                VR 용 적용 정보 가져오기
              </button>
              <button onClick={loadVRCustomLightMaps}>
                vr 라이트맵 불러오기
              </button>
              <button onClick={removeAllLightMaps}>라이트맵 제거</button>
            </div>
          </section>
          {threeExports && (
            <section className="text-sm px-1 flex flex-col my-1">
              <strong>Camera FOV</strong>
              <div className="flex gap-x-1 my-1">
                <button
                  onClick={() => {
                    const camera = threeExports!
                      .camera as THREE.PerspectiveCamera;
                    animateFOV(75, camera);
                  }}
                >
                  Three.js
                </button>
                <button
                  onClick={() => {
                    const camera = threeExports!
                      .camera as THREE.PerspectiveCamera;
                    animateFOV(45, camera);
                  }}
                >
                  Max
                </button>
                <button
                  onClick={() => {
                    const camera = threeExports!
                      .camera as THREE.PerspectiveCamera;
                    animateFOV(57.6, camera);
                  }}
                >
                  Viz4d
                </button>
              </div>
            </section>
          )}
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
