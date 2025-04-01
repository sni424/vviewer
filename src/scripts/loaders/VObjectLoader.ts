import { Object3D } from 'three';
import * as THREE from 'VTHREE';
import { Layer } from '../../Constants.ts';

export default class VObjectLoader extends THREE.ObjectLoader {
  constructor() {
    super();
  }

  parse(json: unknown, onLoad?: (object: Object3D) => void): Object3D {
    function customOnLoad(object: Object3D) {
      object.traverse(o => {
        o.layers.enable(Layer.Model);
      });
      if (onLoad) {
        onLoad(object);
      }
    }
    return super.parse(json, customOnLoad);
  }
}
