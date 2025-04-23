export type FileID = string;
export type FileUrl = string;

export type RawFile = ArrayBuffer;

export type FileType = string;

export const VAssetTypes = [
  'VFile', // 일반 json파일
  'VScene', // THREE.Scene보다 포괄적인 개념. 하나의 옵션을 그리기 위한 모든 내용 포함
  'VOption',
  'VProject',

  // Three.js로 변환가능한 파일들
  'VBufferGeometry',
  'VTexture',
  'VDataTexture',
  'VCompressedTexture',
  'VMaterial',
  'VObject3D', // THREE.Group === THREE.Object3D이다
  'VMesh',
] as const;
export type VAssetType = (typeof VAssetTypes)[number];

export type CommonObject = Record<string, any>;
