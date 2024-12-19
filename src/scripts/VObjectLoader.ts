import { Object3D } from 'three';
import { Layer } from '../Constants.ts';
import * as THREE from './VTHREE.ts';

export default class VObjectLoader extends THREE.ObjectLoader {
  private readonly scene: THREE.Scene;
  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
  }

  parse(json: unknown, onLoad?: (object: Object3D) => void): Object3D {
    const scene = this.scene;
    function customOnLoad(object: Object3D) {
      object.traverse(o => {
        o.layers.enable(Layer.Model);
      });
      scene.add(object);
      if (onLoad) {
        onLoad(object);
      }
    }
    return super.parse(json, customOnLoad);
  }
}
