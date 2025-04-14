export type FileID = string;
export type FileUrl = string;

export type RawFile = ArrayBuffer;

export type FileType = string;

export const VAssetTypes = [
  'VBufferGeometry',
  'VFile',
  'VTexture',
  'VDataTexture',
  'VCompressedTexture',
  'VOption',
  'VMaterial',
  'VScene', // THREE.Scene보다 포괄적인 개념. 하나의 옵션을 그리기 위한 모든 내용 포함
  'VObject3D',
  'VFile',
  'VProject',
] as const;
export type VAssetType = (typeof VAssetTypes)[number];

export type CommonObject = Record<string, any>;
