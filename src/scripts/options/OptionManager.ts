import { useAtom } from 'jotai';
import {
  lightMapAtom,
  modelOptionClassAtom,
  optionSelectedAtom,
  useToast,
} from '../atoms.ts';
import { loadOption, uploadJson } from '../atomUtils.ts';
import { ModelOptionObject } from '../ModelOptionObject.ts';
import { getVKTX2Loader } from '../loaders/VKTX2Loader.ts';
import { createLightmapCache } from '../loaders/VGLTFLoader.ts';
import ModelOption from './ModelOption.ts';
import * as THREE from '../VTHREE.ts';

const useOptionManager = () => {
  const [options, setOptions] = useAtom(modelOptionClassAtom);
  const [optionSelected, setOptionSelected] = useAtom(optionSelectedAtom);
  const [lightMaps, setLightMaps] = useAtom(lightMapAtom);
  const { openToast, closeToast } = useToast();

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

  function processState() {}

  function analyze() {
    const effects = options.map(modelOption => {
      return {
        id: modelOption.id,
        effect: modelOption.arrangeEffects(),
        option: modelOption,
      };
    });

    const result: { [key: string]: { visible?: boolean; lightMap?: string } } =
      {};

    effects.forEach(effectObject => {
      const selectedId = optionSelected[effectObject.id];
      const targetEffect = effectObject.effect[selectedId];
      Object.entries(targetEffect).forEach(([key, value]) => {
        const originalValue:
          | { visible?: boolean; lightMap?: string }
          | undefined = result[key];
        if (originalValue) {
          originalValue.visible =
            originalValue.visible && value.effects.visibleValue;
        } else {
          result[key] = { visible: value.effects.visibleValue };
        }

        const optionId = Object.keys(optionSelected);
        const lmValues = value.effects.lightMapValues;
        const lmValuesKeys = Object.keys(lmValues!!);
        const targetIds = optionId.filter(k => lmValuesKeys.includes(k));
        const targetId = targetIds[0];
        result[key].lightMap = lmValues!![targetId][optionSelected[targetId]];
      });
    });

    return result;
  }

  return { loadOptions, uploadOptionJSON, options, processState, analyze };
};

export default useOptionManager;

async function loadLightMaps(
  keysToLoad: string[]
) {
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