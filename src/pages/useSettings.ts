import { get, set } from 'idb-keyval';
import { WritableAtom } from 'jotai';
import {
  cameraSettingAtom,
  envAtom,
  getAtomValue,
  hotspotAtom,
  materialSettingAtom,
  newRoomAtom,
  orbitSettingAtom,
  postprocessAtoms,
  setAtomValue,
  settingsAtom,
  viewGridAtom
} from '../scripts/atoms';

export type SavedSettings = Partial<ReturnType<typeof getSettings>>;

const SETTING_KEY = '__setting__';

export const getSettings = () => {
  const cameraSetting = getAtomValue(cameraSettingAtom);
  const orbitSetting = getAtomValue(orbitSettingAtom);
  const gridSetting = getAtomValue(viewGridAtom);
  // const rooms = getAtomValue(roomAtom);
  const rooms = getAtomValue(newRoomAtom);
  const hotspots = getAtomValue(hotspotAtom);
  const env = getAtomValue(envAtom);
  const settings = getAtomValue(settingsAtom);
  const materialSetting = getAtomValue(materialSettingAtom);

  const postProcessOptions: Record<string, any> = {};
  const postProcessAtoms = Object.entries(getAtomValue(postprocessAtoms));
  postProcessAtoms.forEach(
    ([label, value]: [string, WritableAtom<any, any, any>]) => {
      postProcessOptions[label] = getAtomValue(value);
    },
  );

  return {
    cameraSetting,
    orbitSetting,
    gridSetting,
    env,
    rooms,
    hotspots,
    settings,
    ...postProcessOptions,
    // lmContrast,
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
      if (undefined !== value.rooms) {
        // setAtomValue(roomAtom, value.rooms);
        setAtomValue(newRoomAtom, value.rooms);
      }
      if (undefined !== value.hotspots) {
        setAtomValue(hotspotAtom, value.hotspots);
      }
      if (undefined !== value.settings) {
        setAtomValue(settingsAtom, value.settings);
      }

      setAtomValue(postprocessAtoms, prev => {
        const copied = { ...prev };
        const loadedKeys = Object.keys(value);
        const postprocessKeys = Object.keys(copied);
        postprocessKeys.forEach(key => {
          if (loadedKeys.includes(key)) {
            setAtomValue(copied[key], (eachPrev: any) => {
              return {
                ...eachPrev,
                ...(value as any)[key],
              };
            });
            // copied[key] = { ...(value as any)[key] };
          }
        });

        return copied;
      });

      // console.log("Loadd", value);
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
