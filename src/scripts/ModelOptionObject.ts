import { atom } from 'jotai';

export type ModelOptionObject = {
  id: string;
  states: ModelOptionState[];
  name: string;
  expanded: boolean;
  defaultSelected?: string;
};

export type ModelOptionState = {
  id: string;
  stateName: string;
  expanded: boolean;
  meshEffects: MeshEffectJSON[];
};

export type MeshEffectJSON = {
  targetMeshProperties: {
    uuid: string;
    name: string;
  };
  effects: Effects;
  expanded: boolean;
};

export type Effects = {
  useVisible: boolean;
  useLightMap: boolean;
  visibleValue: boolean;
  lmValue: string | null;
};

export type ModelOptionSelectedState = {
  [key: string]: ModelOptionState;
};

export const ModelOptionSelectedStateAtom = atom<ModelOptionSelectedState>({});

/**
 * 모델 옵션에 관한 고찰
 *
 * 1. 옵션에 따라 메시에 영향을 주는 형식
 *    - 메시 visible On / Off
 *    - 라이트맵 변경
 * 2. 옵션 변경 시의 카메라 이동 등
 * **/
