import type { VTextureMapKey } from 'VTHREE';
import { FileID } from './AssetTypes';
import { VLoadable } from './VFile';
import { VObject3D } from './VObject3D';
import { VTexture } from './VTexture';

export type VAction =
  | {
      action: 'addMesh';
      mesh: FileID | VLoadable<VObject3D>;
    }
  | {
      action: 'removeMesh';
      mesh: FileID;
    }
  | {
      action: 'setVisible';
      mesh: FileID;
      visible: boolean;
    }
  | {
      action: 'setMaterial';
      mesh: FileID;
      material: FileID;
    }
  | {
      action: 'setTexture';
      mesh?: FileID;
      mat?: FileID;
      target: VTextureMapKey;
      texture: FileID | VLoadable<VTexture>;
    };

export interface VOption {
  id: string;
  scene: FileID; // rootScenes.id
  reference?: FileID; // VOption.id
  actions: VAction[];
}
