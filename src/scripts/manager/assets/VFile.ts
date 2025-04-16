import { FileID, VAssetType, VAssetTypes } from './AssetTypes';

// VFile대신 원격(또는 캐시)에 있는 파일을 레퍼런스로 사용할 때
export type VRemoteFile = {
  id: FileID;
  format: 'json' | 'binary';
  hint?: 'jpg' | 'png' | 'Uint8Array' | 'Uint16Array' | 'Float32Array' | string;
};

// 에셋매니저에서 로드할 수 있는 RemoteFile이거나 VFile
export type VLoadable<T extends Record<any, any> = any> =
  | VRemoteFile
  | VFile<T>;

// json객체
export type VFile<T extends Record<any, any> = any> = {
  id: FileID; // json url : workspace/project/files/[id] <- json파일
  type: VAssetType;
  data: T; // json객체
};

export function isVFile(file?: any) {
  return file?.id && file?.type && VAssetTypes.includes(file?.type);
}

export function isVRemoteFile(file?: any) {
  return file?.id && (file?.format === 'json' || file?.format === 'binary');
}
