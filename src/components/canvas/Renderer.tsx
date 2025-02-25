import { Canvas, useThree } from '@react-three/fiber';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { Layer } from '../../Constants';
import { getSettings } from '../../pages/useSettings';
import {
  cameraMatrixAtom,
  catalogueAtom,
  DPAtom,
  getAtomValue,
  globalGlAtom,
  hotspotAtom,
  loadHistoryAtom,
  MapDst,
  materialSelectedAtom,
  modalAtom,
  moveToPointAtom,
  orbitSettingAtom,
  panelTabAtom,
  pathfindingAtom,
  pointsAtom,
  roomAtom,
  selectedAtom,
  setAtomValue,
  sourceAtom,
  Tabs,
  threeExportsAtom,
  toggleGrid,
  treeScrollToAtom,
  useModal,
  viewGridAtom,
} from '../../scripts/atoms';
import VGLTFLoader from '../../scripts/loaders/VGLTFLoader.ts';
import VTextureLoader from '../../scripts/loaders/VTextureLoader.ts';
import {
  getIntersectLayer,
  getIntersects,
  loadScene,
  saveScene,
  zoomToSelected,
} from '../../scripts/utils';
import { THREE } from '../../scripts/VTHREE';
import { View } from '../../types';
import UnifiedCameraControls from '../camera/UnifiedCameraControls';
import HotspotDialog from '../HotspotDialog';
import MyEnvironment from './EnvironmentMap';
import Grid from './Grid';
import Hotspot from './Hotspot';
import PostProcess from './PostProcess';
import Rooms from './Rooms';
import SelectBox from './SelectBox';
import { useSetThreeExports } from './Viewport';

const MainGrid = () => {
  const on = useAtomValue(viewGridAtom);
  if (!on) {
    return null;
  }

  return <Grid layers={View.Shared}></Grid>;
};

const applyTexture = (
  object: THREE.Object3D,
  texture: THREE.Texture,
  mapDst?: MapDst,
) => {
  object.traverseAll(obj => {
    // console.log('obj : ', obj);
    if (obj.type === 'Mesh') {
      const material = (obj as THREE.Mesh)
        .material as THREE.MeshStandardMaterial;
      if (!material) {
        (obj as THREE.Mesh).material = new THREE.MeshPhysicalMaterial();
      }
      if (mapDst === 'gainmap' || mapDst === 'lightmap' || !mapDst) {
        material.lightMap = texture;
        // material.map = texture;
      } else {
        throw new Error('Invalid mapDst @Renderer');
      }

      material.needsUpdate = true;
    }
  });
};

const useLoadModel = ({
  gl,
  scene,
}: {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
}) => {
  const sources = useAtomValue(sourceAtom);
  const catalogue = useAtomValue(catalogueAtom);
  const setLoadHistoryAtom = useSetAtom(loadHistoryAtom);
  const loaderRef = useRef(new VGLTFLoader(gl));
  const [dp, setDp] = useAtom(DPAtom);

  useEffect(() => {
    console.log('catalogue changed');
    // 무조건 exr
    const flipY = true;
    const as = 'texture';
    const mapDst = 'lightmap';

    Object.values(catalogue).forEach(target => {
      const { glb, type, dpOnTexture, dpOffTexture } = target;

      const file = glb.file;

      // add new History
      setLoadHistoryAtom(history => {
        const newHistory = new Map(history);
        //@ts-ignore
        newHistory.set(file.name, {
          name: file.name,
          start: Date.now(),
          end: 0,
          file: file,
          uuid: null,
        });
        return newHistory;
      });

      // load GLB File
      loaderRef.current.loadAsync(file).then(async gltf => {
        let onT: THREE.Texture | null = null;
        let offT: THREE.Texture | null = null;
        if (dpOnTexture || dpOffTexture) {
          [onT, offT] = await Promise.all([
            dpOnTexture
              ? VTextureLoader.loadAsync(dpOnTexture.file, {
                  gl,
                  as,
                  flipY,
                  saveAs: dpOnTexture.name,
                })
              : null,
            dpOffTexture
              ? VTextureLoader.loadAsync(dpOffTexture.file, {
                  gl,
                  as,
                  flipY,
                  saveAs: dpOffTexture.name,
                })
              : null,
          ]);
        }

        if (type === 'BASE' && onT && offT) {
          applyTexture(gltf.scene, dp.on ? onT : offT, mapDst);
        }

        if (type === 'DP' && onT !== null) {
          applyTexture(gltf.scene, onT, mapDst);
        }

        // DP 업로드를 통해 불러온 모델로 인식
        gltf.scene.traverseAll(object => {
          object.vUserData.modelType = type;
          if (type === 'DP' && !dp.on) {
            object.visible = false;
          }

          if ((object as THREE.Mesh).isMesh) {
            const mesh = object as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (onT) {
              mat.vUserData.dpOnLightMap = onT;
            }
            if (dpOnTexture) {
              mat.vUserData.dpOnTextureFile = dpOnTexture.name;
            }

            if (offT) {
              mat.vUserData.dpOffLightMap = offT;
            }
            if (dpOffTexture) {
              mat.vUserData.dpOffTextureFile = dpOffTexture.name;
            }
          }
        });

        scene.add(...gltf.scene.children);

        setLoadHistoryAtom(history => {
          const newHistory = new Map(history);
          const fileHistory = newHistory.get(file.name);
          if (fileHistory) {
            fileHistory.end = Date.now();
            fileHistory.uuid = gltf.scene.uuid;
          }
          return newHistory;
        });
      });
    });
  }, [catalogue]);

  useEffect(() => {
    sources.forEach(source => {
      const { name, file, map, mapDst } = source;
      setLoadHistoryAtom(history => {
        const newHistory = new Map(history);
        //@ts-ignore
        newHistory.set(file.name, {
          name,
          start: Date.now(),
          end: 0,
          file,
          uuid: null,
        });
        return newHistory;
      });

      loaderRef.current.loadAsync(file).then(async gltf => {
        if (map) {
          const detectFlipY = () => {
            const exrLightmap =
              mapDst === 'lightmap' && map.name.endsWith('.exr');
            const gainmap = mapDst === 'gainmap';
            const pngLightmap =
              mapDst === 'lightmap' && map.name.endsWith('.png');
            const ktxLightmap =
              mapDst === 'lightmap' && map.name.endsWith('.ktx');

            if (exrLightmap) {
              return true;
            }

            if (gainmap) {
              return true;
            }

            if (pngLightmap) {
              return false;
            }

            if (ktxLightmap) {
              return false;
            }

            console.error(map, file);
            throw new Error('flipY감지 실패 : ' + file.name);
          };

          const flipY = detectFlipY();
          const texture = await VTextureLoader.loadAsync(map, {
            gl,
            as: mapDst === 'gainmap' ? 'gainmap' : 'texture',
            flipY,
          });

          applyTexture(gltf.scene, texture, mapDst);
        }

        scene.add(...gltf.scene.children);

        setLoadHistoryAtom(history => {
          const newHistory = new Map(history);
          newHistory.get(file.name)!.end = Date.now();
          newHistory.get(file.name)!.uuid = gltf.scene.uuid;
          return newHistory;
        });
      });
    });
  }, [sources]);
};

function Renderer() {
  // useStats();
  const threeExports = useThree();

  const setThreeExportsAtom = useSetAtom(threeExportsAtom);
  // const setSharedExports = useSetAtom(sharedThreeAtom);
  const setSharedExports = useSetThreeExports();
  const { scene, camera } = threeExports;
  useLoadModel(threeExports);
  const setCameraAtom = useSetAtom(cameraMatrixAtom);

  useEffect(() => {
    setThreeExportsAtom(threeExports);
    camera.position.set(1, 1, 1);
    const mat = camera.matrix.clone();
    setCameraAtom(mat);
    setSharedExports(threeExports);
  }, []);

  return (
    <>
      <UnifiedCameraControls />
      <MyEnvironment></MyEnvironment>
      <SelectBox></SelectBox>
      <PostProcess></PostProcess>
      <Rooms></Rooms>
      <MainGrid></MainGrid>
      <Hotspot></Hotspot>
    </>
  );
}

const useMouseHandler = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const [selected, setSelected] = useAtom(selectedAtom);
  const setMaterialSelected = useSetAtom(materialSelectedAtom);
  const setScrollTo = useSetAtom(treeScrollToAtom);
  const moveToPoint = useAtomValue(moveToPointAtom);
  const lastClickRef = useRef<number>(0);
  const mouseDownPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isRoomCreating = useAtomValue(roomAtom).some(room =>
    Boolean(room.creating),
  );
  const isSettingHotspot = useAtomValue(hotspotAtom).some(hotspot =>
    Boolean(hotspot.targetSetting),
  );
  const { openModal, closeModal } = useModal();

  // 드래그로 간주할 최소 거리
  const dragThreshold = 5;

  if (!threeExports) {
    return;
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (isRoomCreating) {
      return;
    }

    lastClickRef.current = Date.now();
    // 마우스 다운 시 위치 저장
    mouseDownPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (isRoomCreating) {
      return;
    }

    if (!threeExports) {
      return;
    }

    // 마우스 업 시 이동 거리 계산
    const xGap = Math.abs(e.clientX - mouseDownPosition.current.x);
    const yGap = Math.abs(e.clientY - mouseDownPosition.current.y);

    // 이동 거리가 임계값 이상이면 드래그로 간주
    if (
      xGap > dragThreshold ||
      yGap > dragThreshold ||
      Date.now() - lastClickRef.current > 200
    ) {
      return;
    }

    // 지점 찍어서 이동하는지 확인
    if (moveToPoint?.setting) {
      const { intersects } = getIntersects(e, threeExports);
      if (intersects.length > 0) {
        const i = intersects[0];
        const mat = getAtomValue(cameraMatrixAtom)!.clone();
        const cameraY = mat.elements[13];
        const point = i.point;
        point.y = cameraY;
        mat.setPosition(point);

        setAtomValue(moveToPointAtom, {
          setting: false,
          point,
        });
        threeExports.camera.moveTo({
          pathFinding: {
            matrix: mat.toArray(),
          },
        });

        return;
      }
    }

    // debugger;
    // 모델 인터섹트 이전에 핫스팟 인터섹트 확인
    const hotspotIntersects = getIntersectLayer(e, threeExports, Layer.Hotspot);
    if (hotspotIntersects.length > 0) {
      const hotspotIndex = hotspotIntersects[0].object.vUserData.hotspotIndex;
      console.log({ hotspotIndex });
      if (typeof hotspotIndex === 'number') {
        openModal(<HotspotDialog index={hotspotIndex} />);
      }
      return;
    }

    const { intersects, mesh } = getIntersects(e, threeExports);
    if (intersects.length > 0) {
      // console.log(intersects[0].object.uuid);
      if (isSettingHotspot) {
        const position = intersects[0].point;
        setAtomValue(hotspotAtom, prev => {
          if (!prev.some(hotspot => hotspot.targetSetting)) {
            return prev;
          }
          const copied = [...prev];
          const index = copied.findIndex(hotspot => hotspot.targetSetting);
          copied[index].targetSetting = false;
          copied[index].target = [position.x, position.y, position.z];
          return copied;
        });
        return;
      }

      if (e.ctrlKey) {
        setSelected(selected => {
          if (selected.includes(intersects[0].object.uuid)) {
            setMaterialSelected(null);
            return selected.filter(uuid => uuid !== intersects[0].object.uuid);
          }
          if (intersects[0].object.type === 'Mesh') {
            setMaterialSelected(
              (intersects[0].object as THREE.Mesh).material as THREE.Material,
            );
            setScrollTo(intersects[0].object.uuid);
          }
          return [...selected, intersects[0].object.uuid];
        });
      } else {
        if (!intersects[0].object.vUserData.isProbeMesh) {
          setSelected([intersects[0].object.uuid]);
          setScrollTo(intersects[0].object.uuid);
          if (intersects[0].object.type === 'Mesh') {
            setMaterialSelected(
              (intersects[0].object as THREE.Mesh).material as THREE.Material,
            );
          }
        }
      }

      // if riht
      // if (e.button === 2) {

      // }
    } else {
      setSelected([]);
      // console.log("none")
    }
  };

  return {
    handleMouseDown,
    handleMouseUp,
  };
};
const useKeyHandler = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const [selected, setSelected] = useAtom(selectedAtom);
  const setMaterialSelected = useSetAtom(materialSelectedAtom);
  const setScrollTo = useSetAtom(treeScrollToAtom);
  const setTab = useSetAtom(panelTabAtom);
  const setTreeScrollTo = useSetAtom(treeScrollToAtom);

  useEffect(() => {
    if (!threeExports) {
      return;
    }

    const { scene } = threeExports;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement) {
        const isInputFocused =
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA';
        if (isInputFocused) {
          return; // 이벤트 핸들링 종료
        }
      }
      // on escape
      if (e.key === 'Escape') {
        setSelected([]);
        setMaterialSelected(null);
        setScrollTo(null);
        setAtomValue(modalAtom, null);
        return;
      }

      if (getAtomValue(panelTabAtom) === 'hotspot') {
        return;
      }

      if (e.ctrlKey && e.code === 'KeyA') {
        e.preventDefault();
        const everyObject: string[] = [];
        scene.traverse(obj => {
          if (obj.type === 'BoxHelper') {
            return;
          }
          everyObject.push(obj.uuid);
        });
        setSelected(everyObject);
        return;
      }

      if (e.code === 'Delete') {
        e.preventDefault();
        let deletes: THREE.Object3D[] = [];
        scene.traverse(obj => {
          if (selected.includes(obj.uuid)) {
            deletes.push(obj);
          }
        });
        console.log(deletes);

        deletes.forEach(obj => {
          obj.removeFromParent();
        });
        deletes = [];

        const { gl } = threeExports;
        gl.renderLists.dispose();
        setSelected([]);
        return;
      }

      // ctrl s
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        saveScene(scene).then(() => {
          alert('저장 완료');
        });
        return;
      }

      // 자유이동 <-> OrbitControls
      // tilde
      if (e.code === 'KeyQ' || e.code === 'Backquote') {
        e.preventDefault();
        const { orbitSetting } = getSettings();
        setAtomValue(orbitSettingAtom, prev => ({
          ...prev,
          enabled: !orbitSetting.enabled,
        }));
        return;
      }

      // ctrl l
      if (e.ctrlKey && e.code === 'KeyL') {
        e.preventDefault();
        loadScene()
          .then(loaded => {
            if (loaded) {
              scene.removeFromParent();
              scene.add(loaded);
              alert('로드 완료');
            }
          })
          .catch(e => {
            alert('로드 실패');
          });
        return;
      }

      // ctrl + 숫자
      const numberKey = parseInt(e.key);
      if (e.ctrlKey && !isNaN(numberKey)) {
        e.preventDefault();
        setAtomValue(panelTabAtom, Tabs[numberKey - 1]);
        return;
      }

      if (e.code === 'KeyZ') {
        zoomToSelected();
      }

      if (e.code === 'KeyT') {
        if (selected.length > 0) {
          setTab('tree');
          setTreeScrollTo(selected[0]);
        }
      }

      if (e.code === 'KeyG') {
        toggleGrid();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [threeExports, selected]);
};

function MoveTo() {
  const moveToPoint = useAtomValue(moveToPointAtom);
  const pf = useAtomValue(pathfindingAtom);

  if (!moveToPoint?.point) {
    return null;
  }

  const g = pf?.geometry;
  const point = moveToPoint.point;

  return (
    <>
      <mesh position={[point.x, 1.5, point.z]}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshBasicMaterial color="red" />
      </mesh>
      {g && (
        <mesh>
          <primitive object={g}></primitive>
          <meshBasicMaterial color="red" />
        </mesh>
      )}
    </>
  );
}

function Points() {
  const points = useAtomValue(pointsAtom);

  return (
    <>
      {points.map((drawablePoint, i) => {
        const { point, color } = drawablePoint;
        if ((point as THREE.Matrix4).isMatrix4) {
          const position = new THREE.Vector3();
          position.setFromMatrixPosition(point as THREE.Matrix4);
          return (
            <mesh position={position}>
              <sphereGeometry args={[0.05, 32, 32]} />
              <meshBasicMaterial color={color ?? 'red'} />
            </mesh>
          );
        } else if ((point as THREE.Vector3).isVector3) {
          return (
            <mesh position={point as THREE.Vector3}>
              <sphereGeometry args={[0.05, 32, 32]} />
              <meshBasicMaterial color={color ?? 'red'} />
            </mesh>
          );
        } else if (point.x && point.z) {
          return (
            <mesh position={[point.x, 1.0, point.z]}>
              <sphereGeometry args={[0.05, 32, 32]} />
              <meshBasicMaterial color={color ?? 'red'} />
            </mesh>
          );
        }
      })}
    </>
  );
}

function RendererContainer() {
  // const threeExports = useAtomValue(threeExportsAtom);
  useKeyHandler();
  const mouse = useMouseHandler();

  const gl = useAtomValue(globalGlAtom);
  const cameraLayer = new THREE.Layers();
  cameraLayer.enableAll();
  cameraLayer.disable(View.Top);
  cameraLayer.disable(View.Front);

  return (
    <div
      id="canvasDiv"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <Canvas
        gl={gl}
        camera={{ layers: cameraLayer }}
        onMouseDown={mouse?.handleMouseDown}
        onMouseUp={mouse?.handleMouseUp}
        style={{
          width: '100%',
          height: '100%',
        }}
        onCreated={state => {
          const { scene } = state;
          scene.layers.enable(Layer.Model);
        }}
      >
        <Renderer></Renderer>
        <MoveTo></MoveTo>
        <Points></Points>
      </Canvas>
    </div>
  );
}

export default RendererContainer;
