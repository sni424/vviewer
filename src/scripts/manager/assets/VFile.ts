import { FileID, VAssetType, VAssetTypes } from './AssetTypes';

// VFile대신 원격(또는 캐시)에 있는 파일을 레퍼런스로 사용할 때
export type VFileRemote = {
  id: FileID;
  format: 'json' | 'binary';
};

// json객체
export type VFile<T extends Record<any, any> = any> = {
  id: FileID; // json url : workspace/project/files/[id] <- json파일
  type: VAssetType;
  data: T; // json객체
};

export function isVFile(file?: any) {
  return file?.id && file?.type && VAssetTypes.includes(file?.type);
}

export function isVFileRemote(file?: any) {
  return file?.id && (file?.format === 'json' || file?.format === 'binary');
}
