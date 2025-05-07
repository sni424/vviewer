import { type THREE } from 'VTHREE';
import { DataArray, VAssetType } from './AssetTypes';
import { isVFile, VLoadable, VRemoteFile } from './VFile';

// TextureJSON에서 image만 변경
export interface VTexture {
  version: number; // 우리가 부여하는 버전. toAsset()을 다시 불러야되는지 판단하기 위함
  uuid: string;
  name: string;

  image: VLoadable | VTextureSource;
  width?: number; // VDataTexture에서 사용
  height?: number; // VDataTexture에서 사용
  arrayType?: string; // VDataTexture에서 사용

  mapping: THREE.AnyMapping;
  channel: number;

  repeat: [x: number, y: number];
  offset: [x: number, y: number];
  center: [x: number, y: number];
  rotation: number;

  wrap: [wrapS: number, wrapT: number];

  format: THREE.AnyPixelFormat;
  internalFormat: THREE.PixelFormatGPU | null;
  type: THREE.TextureDataType;
  colorSpace: string;

  minFilter: THREE.MinificationTextureFilter;
  magFilter: THREE.MagnificationTextureFilter;
  anisotropy: number;

  flipY: boolean;

  generateMipmaps: boolean;
  premultiplyAlpha: boolean;
  unpackAlignment: number;

  userData?: Record<string, unknown>;

  // imageData: VFileRemote;
}

export const VTextureTypes: VAssetType[] = [
  'VTexture',
  'VDataTexture',
  'VCompressedTexture',
];

export const isVTextureFile = (file?: any): boolean => {
  return isVFile(file) && VTextureTypes.includes(file?.type);
};

export interface VTextureSource {
  data: VRemoteFile | DataArray;
  type: string;
  width: number;
  height: number;
}
