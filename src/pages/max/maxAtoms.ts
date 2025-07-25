import { atom } from 'jotai';
import { splitExtension } from 'src/scripts/utils.ts';
import * as THREE from 'VTHREE';

export type MaxFileType =
  | 'texture'
  | 'image'
  | 'material'
  | 'geometry'
  | 'object';

export type MaxFileData =
  | THREE.MeshPhysicalMaterial
  | THREE.Texture
  | THREE.Source
  | THREE.BufferGeometry
  | THREE.Object3D;

export function getMaxFileType(file: File): MaxFileType {
  const { ext } = splitExtension(file.name);
  switch (ext) {
    case 'vrg':
      return 'geometry';
    case 'vri':
      return 'image';
    case 'vrm':
      return 'material';
    case 'vro':
      return 'object';
    case 'vrt':
      return 'texture';
    default:
      throw new Error(
        'getMaxFileType : unsupported extension extension type : ' + file.name,
      );
  }
}

export type MaxFile = {
  originalFile: File;
  type: MaxFileType;
  loaded: boolean;
  name: string;
  resultData?: MaxFileData | any;
};

export const maxFileAtom = atom<MaxFile[]>([]);
