import { get, set } from 'idb-keyval';
import {
  cameraSettingAtom,
  envAtom,
  getAtomValue,
  orbitSettingAtom,
  postprocessAtoms,
  setAtomValue,
  viewGridAtom,
} from '../scripts/atoms';

export type SavedSettings = Partial<ReturnType<typeof getSettings>>;

const SETTING_KEY = '__setting__';

export const getSettings = () => {
  const cameraSetting = getAtomValue(cameraSettingAtom);
  const orbitSetting = getAtomValue(orbitSettingAtom);
  const gridSetting = getAtomValue(viewGridAtom);
  const env = getAtomValue(envAtom);
  const postprocesses = getAtomValue(postprocessAtoms).map(getAtomValue);

  return {
    cameraSetting,
    orbitSetting,
    gridSetting,
    env,
    ...postprocesses,
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

      console.log("Loadd", value);
    }
    return value;
  });
  return retval;
};

export const saveSettings = () => {
  const settings = getSettings();
  return set(SETTING_KEY, settings);
};

export const defaultSettings = async () => {
  const defaultSettings: SavedSettings = {
    cameraSetting: {
      moveSpeed: 3,
      isoView: false,
      cameraY: 1.5,
    },
    orbitSetting: {
      autoRotate: false,
      enabled: true,
    },
  };

  return set(SETTING_KEY, defaultSettings);
};