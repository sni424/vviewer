import * as THREE from 'three';
import { MoveActionOptions } from '../../types';
import { moveTo } from '../utils.ts';

declare module 'three' {
  interface Camera {
    moveTo(action: MoveActionOptions): void;
  }
}

THREE.Camera.prototype.moveTo = function (action: MoveActionOptions) {
  if (this.type !== 'PerspectiveCamera') {
    console.error(this);
    throw new Error('Not a PerspectiveCamera');
  }
  moveTo(this as THREE.PerspectiveCamera, action);
};
