export type VRemoteFile = {
  isVRemoteFile: true; // 로컬에서 판단할 때 있으면 좋음
  id: FileID;
  format: 'json' | 'jpg' | 'png' | 'ktx' | 'buffer' | TYPED_ARRAY_NAME;
};

// 에셋매니저에서 로드할 수 있는 RemoteFile이거나 VFile
export type VLoadable<T extends Record<any, any> = any> =
  | VRemoteFile
  | VFile<T>;

// json객체
export type VFile<T extends Record<any, any> = any> = {
  isVFile: true;
  id: FileID; // json url : workspace/project/files/[id] <- json파일
  type: VAssetType;
  data: T; // json객체
};

export function isVFile(file?: any) {
  return Boolean(file?.isVFile);
}

export function isVRemoteFile(file?: any) {
  return Boolean(file?.isVRemoteFile);
}
