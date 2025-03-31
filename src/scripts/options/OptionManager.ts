import { useAtom, useAtomValue } from 'jotai';
import {
  animationDurationAtom,
  getAtomValue,
  lightMapAtom,
  minimapAtom,
  modelOptionClassAtom,
  optionProcessingAtom,
  optionSelectedAtom,
  ProbeAtom,
  selectedAtom,
  threeExportsAtom,
  useToast,
} from '../atoms.ts';
import { loadOption, uploadJson } from '../atomUtils.ts';
import { Effects, ModelOptionObject } from '../ModelOptionObject.ts';
import { getVKTX2Loader } from '../loaders/VKTX2Loader.ts';
import { createLightmapCache } from '../loaders/VGLTFLoader.ts';
import ModelOption from './ModelOption.ts';
import * as THREE from '../VTHREE.ts';
import OptionState, { FunctionEffects, FunctionEffectsBooleans, FunctionEffectsURLs } from './OptionState.ts';
import gsap from 'gsap';
import VMaterial from '../material/VMaterial.ts';
import {
  changeMeshLightMapWithTransition,
  changeMeshVisibleWithTransition,
} from '../utils.ts';
import { ENV } from '../../Constants.ts';
import { useSetAtom } from 'jotai/index';
import { useEffect } from 'react';

const useOptionManager = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const { scene } = threeExports || {};
  const [options, setOptions] = useAtom(modelOptionClassAtom);
  const [optionSelected, setOptionSelected] = useAtom(optionSelectedAtom);
  const [lightMaps, setLightMaps] = useAtom(lightMapAtom);
  const [isProcessing, setProcessing] = useAtom(optionProcessingAtom);
  const setSelecteds = useSetAtom(selectedAtom);
  const animationDuration = useAtomValue(animationDurationAtom);
  const probes = useAtomValue(ProbeAtom);
  const [minimapInfo, setMinimapInfo] = useAtom(minimapAtom);
  const { openToast, closeToast } = useToast();

  useEffect(() => {
    console.log('minimapInfo changed in hook : ', minimapInfo);
  }, [minimapInfo])

  async function loadOptions(fileName: string) {
    openToast('옵션 불러오는 중..', { autoClose: false });
    setOptions([]);
    const optionJSON = (await loadOption(fileName)) as ModelOptionObject[];
    const keys = Object.keys(lightMaps);
    const keysToLoad: string[] = [];
    optionJSON.forEach(option => {
      const states = option.states;
      states.forEach(state => {
        const meshEffects = state.meshEffects;
        meshEffects.forEach(effect => {
          const lm = effect.effects.lightMapValues;
          if (lm) {
            const optionValues = Object.values(lm);
            optionValues.forEach(value => {
              const lms = Object.values(value);
              lms.forEach(lm => {
                // 이미 로드된 라이트맵이면 패스
                if (!keys.includes(lm) && !keysToLoad.includes(lm)) {
                  keysToLoad.push(lm);
                }
              });
            });
          }
        });
      });
    });

    // JSON -> Class
    const modelOptions = optionJSON.map(option => {
      return new ModelOption().fromJSON(option);
    });

    // 옵션에서 사용되는 LightMaps Load
    if (keysToLoad.length > 0) {
      openToast('옵션 라이트맵 불러오는 중..', {
        autoClose: false,
        override: true,
      });

      const lightMapObj = await loadLightMaps(keysToLoad);
      setLightMaps(pre => {
        return { ...pre, ...lightMapObj };
      });
    }

    // 안전하게 라이트맵 다 로드 후 옵션 Set
    setOptions(modelOptions);

    // 옵션 기본 값 자동 선택 하도록
    const optionSelected: { [key: string]: string } = {};
    modelOptions.forEach(option => {
      if (option.states.length > 0) {
        optionSelected[option.id] = option.defaultSelected;
      }
    });
    setOptionSelected(optionSelected);
    closeToast();
  }

  function uploadOptionJSON(fileName: string) {
    uploadJson(
      fileName,
      options.map(o => o.toJSON()),
    )
      .then(res => res.json())
      .then(res => {
        if (res?.success === true) {
          alert('업로드 완료');
        } else {
          throw res;
        }
      })
      .catch(err => {
        console.log(err);
        alert('업로드 실패');
      });
  }

  function processState(state: OptionState) {
    if (!scene) {
      console.warn('scene is Not Initialized');
      return;
    }
    const option = state.parent;
    if (isProcessing) {
      console.warn('processState is On Processing');
      return;
    }
    setSelecteds([]);
    const nowSelected = { ...optionSelected };
    nowSelected[option.id] = state.id;
    setOptionSelected(nowSelected);
    setProcessing(true);
    const meshEffects = state.meshEffects;
    const probesToRender: string[] = [];
    const anlayzed = analyze(nowSelected);
    const timeLines: gsap.core.Timeline[] = [];
    meshEffects.forEach(meshEffect => {
      const timeLine = gsap.timeline().pause();
      const object = scene
        .getObjectsByProperty('name', meshEffect.name)
        .find(o => o.type === 'Mesh');
      if (object) {
        const mesh = object as THREE.Mesh;
        const effects = meshEffect.effect;
        const mat = mesh.material as VMaterial;
        // Visible Control
        if (effects.useVisible) {
          const targetVisible = anlayzed.meshResult[mesh.name].visible;
          if (targetVisible === undefined) {
            throw new Error('targetVisible set Error');
          }

          if (mesh.visible !== targetVisible) {
            changeMeshVisibleWithTransition(
              mesh,
              animationDuration,
              targetVisible,
              timeLine,
            );
          }
        }

        // LightMap control
        if (effects.useLightMap) {
          const lightMapCache = getAtomValue(lightMapAtom);
          const keys = Object.keys(lightMapCache);
          let target = anlayzed.meshResult[mesh.name].lightMap;

          if (target && !target.startsWith('https')) {
            target = ENV.base + target;
          }

          if (!target) {
            console.log('lightMap Setting null : ', mat, mesh);
            mat.lightMap = null;
          } else if (keys.includes(target)) {
            const { texture } = lightMapCache[target];
            texture.flipY = false;
            changeMeshLightMapWithTransition(
              mesh,
              animationDuration,
              texture,
              timeLine,
            );
          } else {
            // TODO fetch
          }
        }

        const probeId = mat.vUserData.probeId;
        if (probeId) {
          // 그냥 해당 프로브 리렌더
          if (!probesToRender.includes(probeId)) {
            probesToRender.push(probeId);
          }
        }

        timeLines.push(timeLine);
      } else {
        console.warn('no Mesh Found On state, passing By : ', meshEffect.name);
      }
    });
    const functionResults = anlayzed.functionResult;
    console.log('fR : ', functionResults);
    if (functionResults.changeMinimap && functionResults.minimap !== undefined) {
      console.log('changeMinimap! : ', functionResults.changeMinimap, functionResults.minimap);
      setMinimapInfo(pre => {
        console.log('updating : ', pre);
        const result = {...pre, useIndex: functionResults.minimap};
        console.log('to : ', result);
        return result;
      });
    }

    function processAfter() {
      probes.forEach(probe => {
        probe.renderCamera(true);
      });
      setProcessing(false);
    }

    openToast('애니메이션 실행됨', {
      duration: animationDuration,
      autoClose: true,
    });

    if (timeLines.length > 0) {
      timeLines.forEach(timeLine => {
        timeLine.play(0);
      });

      setTimeout(() => {
        console.log('done ? ');
        processAfter();
      }, animationDuration * 1000);
    } else {
      processAfter();
    }
  }

  function analyze(nowSelected?: { [key: string]: string }) {
    const selectedInfo = nowSelected ? nowSelected : optionSelected;
    const effects = options.map(modelOption => {
      return {
        id: modelOption.id,
        effect: modelOption.arrangeEffects(),
        option: modelOption,
      };
    });

    const meshResult: {
      [key: string]: { visible?: boolean; lightMap?: string; minimap?: number };
    } = {};
    const functionResult: {
      changeMinimap: boolean;
      minimap?: number;
    } = {changeMinimap: false, minimap: 0};

    effects.forEach(({ id: modelOptionId, effect: effects, option }) => {
      const selectedId = selectedInfo[modelOptionId];
      const {
        meshEffects,
        functionEffects,
      }: {
        functionEffects: FunctionEffects;
        meshEffects: {
          [key: string]: {
            mesh: THREE.Mesh;
            effects: Effects;
          };
        };
      } = effects[selectedId];
      // Handle Functional Effects
      const [
        { changeMinimap, changeWall, changeNav, changeFloor },
        { minimap, walls, nav, floor },
      ] = [functionEffects.booleans, functionEffects.urls];

      const originalMinimapIndex = minimapInfo.useIndex;

      if (changeMinimap) {
        const index = minimapInfo.urls.indexOf(minimap);
        if (index >= 0) {
          // 현재 상태와 같으면 change X
          functionResult.changeMinimap = changeMinimap;
          functionResult.minimap = index;
        }
      }

      // Handle Mesh Effects
      Object.entries(meshEffects).forEach(([meshName, { mesh, effects }]) => {
        const originalValue:
          | { visible?: boolean; lightMap?: string }
          | undefined = meshResult[meshName];
        if (originalValue) {
          originalValue.visible = originalValue.visible && effects.visibleValue;
        } else {
          meshResult[meshName] = { visible: effects.visibleValue };
        }

        const optionId = Object.keys(selectedInfo);
        const lmValues = effects.lightMapValues;
        const lmValuesKeys = Object.keys(lmValues!!);
        const targetIds = optionId.filter(k => lmValuesKeys.includes(k));
        const targetId = targetIds[0];
        meshResult[meshName].lightMap =
          lmValues!![targetId][selectedInfo[targetId]];
      });
    });

    return { meshResult, functionResult };
  }

  return {
    loadOptions,
    uploadOptionJSON,
    options,
    processState,
    analyze,
    isProcessing,
    optionSelected,
  };
};

export default useOptionManager;

async function loadLightMaps(keysToLoad: string[]) {
  const loader = getVKTX2Loader();
  const map = new Map<string, THREE.Texture>();
  await Promise.all(
    keysToLoad.map(async key => {
      const texture = await loader.loadAsync(key);
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.channel = 1;
      texture.vUserData.mimeType = 'image/ktx2';
      map.set(decodeURI(key), texture);
    }),
  );

  const gl = new THREE.WebGLRenderer();

  return await createLightmapCache(map, gl);
}
