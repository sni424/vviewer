import { atom } from 'jotai';
import { splitExtension } from 'src/scripts/utils.ts';

export type MaxFileType =
  | 'texture'
  | 'image'
  | 'material'
  | 'geometry'
  | 'object';

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
};

export const maxFileAtom = atom<MaxFile[]>([]);
