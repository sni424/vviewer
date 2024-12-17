import { get, set } from 'idb-keyval';
import {
  cameraSettingAtom,
  envAtom,
  getAtomValue,
  orbitSettingAtom,
  setAtomValue,
} from '../scripts/atoms';

export type SavedSettings = ReturnType<typeof getSettings>;

const SETTING_KEY = '__setting__';

export const getSettings = () => {
  const cameraSetting = getAtomValue(cameraSettingAtom);
  const orbitSetting = getAtomValue(orbitSettingAtom);
  const env = getAtomValue(envAtom);

  return {
    cameraSetting,
    orbitSetting,
    env,
  };
};

export const loadSettings = () => {
  const retval = get(SETTING_KEY).then((value: SavedSettings) => {
    if (value) {
      if (value.cameraSetting) {
        setAtomValue(cameraSettingAtom, value.cameraSetting);
      }
      if (value.orbitSetting) {
        setAtomValue(orbitSettingAtom, value.orbitSetting);
      }
      if (value.env) {
        setAtomValue(envAtom, value.env);
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
