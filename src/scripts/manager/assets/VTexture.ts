import { type THREE } from 'VTHREE';
import { isVFile, type VFileRemote } from './VFile';

// TextureJSON에서 image만 변경
export interface VTexture {
  uuid: string;
  name: string;

  image: VFileRemote;

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

const VTextureTypes: string[] = [
  'VTexture',
  'VDataTexture',
  'VCompressedTexture',
];

export const isVTextureFile = (file?: any): boolean => {
  return isVFile(file) && VTextureTypes.includes(file?.type);
};
