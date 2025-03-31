import { RootState } from '@react-three/fiber';
import * as THREE from 'three';
import { View } from '../../types.ts';

declare global {
  interface Window {
    getThree: (view: View) => RootState | undefined;
    setThree: (view: View, state: RootState) => RootState;
    threeStore: { [key in View]: RootState | undefined };
  }
}

window.threeStore = {
  [View.Shared]: undefined,
  [View.Main]: undefined,
  [View.Top]: undefined,
  [View.Front]: undefined,
  [View.Right]: undefined,
  [View.Back]: undefined,
  [View.Left]: undefined,
  [View.Bottom]: undefined,
};

window.setThree = (view: View, state: RootState) => {
  window.threeStore[view] = state;
  return state;
};

window.getThree = (view: View = View.Shared) => {
  return window.threeStore[view];
};

// traverse때문에 먼저 임포트
import "./Object3D.ts";


// 구현체 임포트
import "./Camera.ts";
import "./Material.ts";
import "./Matrix4.ts";
import "./Mesh.ts";
import "./Shader.ts";
import "./Texture.ts";
import "./Vector3.ts";


export * from 'three';
export { THREE };

