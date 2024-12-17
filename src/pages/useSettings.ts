import { get, set } from 'idb-keyval';
import {
  cameraSettingAtom,
  envAtom,
  getAtomValue,
  globalBrightnessContrastAtom,
  orbitSettingAtom,
  setAtomValue,
  viewGridAtom,
} from '../scripts/atoms';

export type SavedSettings = ReturnType<typeof getSettings>;

const SETTING_KEY = '__setting__';

export const getSettings = () => {
  const cameraSetting = getAtomValue(cameraSettingAtom);
  const orbitSetting = getAtomValue(orbitSettingAtom);
  const gridSetting = getAtomValue(viewGridAtom);
  const brightnessContrastSetting = getAtomValue(globalBrightnessContrastAtom);
  const env = getAtomValue(envAtom);

  return {
    cameraSetting,
    orbitSetting,
    gridSetting,
    env,
    brightnessContrastSetting
  };
};

export const loadSettings = () => {
  const retval = get(SETTING_KEY).then((value: SavedSettings) => {
    if (value) {
      if (undefined !== value.cameraSetting) {
        setAtomValue(cameraSettingAtom, value.cameraSetting);
      }
      if (undefined !== value.orbitSetting) {
        setAtomValue(orbitSettingAtom, value.orbitSetting);
      }
      if (undefined !== value.env) {
        setAtomValue(envAtom, value.env);
      }
      if (undefined !== value.gridSetting) {
        setAtomValue(viewGridAtom, value.gridSetting);
      }
      if (undefined !== value.brightnessContrastSetting) {
        setAtomValue(globalBrightnessContrastAtom, value.brightnessContrastSetting);
      }
    }
    return value;
  });
  return retval;
};

export const saveSettings = () => {
  const settings = getSettings();
  return set(SETTING_KEY, settings);
};
