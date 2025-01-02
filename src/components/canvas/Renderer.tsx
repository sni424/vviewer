import { Canvas, useThree } from '@react-three/fiber';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { Layer } from '../../Constants';
import { getSettings } from '../../pages/useSettings';
import {
  cameraMatrixAtom,
  getAtomValue,
  globalGlAtom,
  hotspotAtom,
  loadHistoryAtom,
  materialSelectedAtom,
  modalAtom,
  orbitSettingAtom,
  panelTabAtom,
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
import {
  getIntersectLayer,
  getIntersects,
  loadScene,
  saveScene,
  zoomToSelected,
} from '../../scripts/utils';
import VGLTFLoader from '../../scripts/VGLTFLoader';
import VTextureLoader from '../../scripts/VTextureLoader';
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
  mapDst?: 'lightmap' | 'emissivemap' | 'gainmap',
) => {
  object.traverseAll(obj => {
    // console.log('obj : ', obj);
    if (obj.type === 'Mesh') {
      const material = (obj as THREE.Mesh)
        .material as THREE.MeshStandardMaterial;
      if (!material) {
        (obj as THREE.Mesh).material = new THREE.MeshPhysicalMaterial();
      }
      if (mapDst === 'lightmap' || !mapDst) {
        material.lightMap = texture;
        // material.map = texture;
      } else if (mapDst === 'emissivemap') {
        //three.js 특성상 emissiveMap을 적용하려면 emissive를 설정해야함
        material.emissive = new THREE.Color(0xffffff);
        material.emissiveMap = texture;
        material.emissiveIntensity = 0.5;
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
  const setLoadHistoryAtom = useSetAtom(loadHistoryAtom);
  const loaderRef = useRef(new VGLTFLoader());

  useEffect(() => {
    sources.forEach(source => {
      const { name, url, file, map, mapDst } = source;
      setLoadHistoryAtom(history => {
        const newHistory = new Map(history);
        //@ts-ignore
        newHistory.set(url, {
          name,
          start: Date.now(),
          end: 0,
          file,
          uuid: null,
        });
        return newHistory;
      });

      loaderRef.current.loadAsync(url).then(async gltf => {
        if (map) {
          const texture = await VTextureLoader.loadAsync(map, { gl });

          applyTexture(gltf.scene, texture, mapDst);
        }

        scene.add(gltf.scene);

        setLoadHistoryAtom(history => {
          const newHistory = new Map(history);
          newHistory.get(url)!.end = Date.now();
          newHistory.get(url)!.uuid = gltf.scene.uuid;
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
  const lastClickRef = useRef<number>(0);
  const mouseDownPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isRoomCreating = useAtomValue(roomAtom).some(room =>
    Boolean(room.creating),
  );
  const isSettingHotspot = useAtomValue(hotspotAtom).some(hotspot =>
    Boolean(hotspot.positionSetting),
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
          if (!prev.some(hotspot => hotspot.positionSetting)) {
            return prev;
          }
          const copied = [...prev];
          const index = copied.findIndex(hotspot => hotspot.positionSetting);
          copied[index].positionSetting = false;
          copied[index].position = [position.x, position.y, position.z];
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

      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
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

      if (e.key === 'Delete') {
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
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveScene(scene).then(() => {
          alert('저장 완료');
        });
        return;
      }

      // 자유이동 <-> OrbitControls
      // tilde
      if (e.key.toLowerCase() === 'q' || e.key === '`') {
        e.preventDefault();
        const { orbitSetting } = getSettings();
        setAtomValue(orbitSettingAtom, prev => ({
          ...prev,
          enabled: !orbitSetting.enabled,
        }));
        return;
      }

      // ctrl l
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
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

      if (e.key.toLowerCase() === 'z') {
        zoomToSelected();
      }

      if (e.key.toLowerCase() === 't') {
        if (selected.length > 0) {
          setTab('tree');
          setTreeScrollTo(selected[0]);
        }
      }

      if (e.key.toLowerCase() === 'g') {
        toggleGrid();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [threeExports, selected]);
};

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
      </Canvas>
    </div>
  );
}

export default RendererContainer;
