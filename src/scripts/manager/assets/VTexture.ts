import { THREE } from 'VTHREE';
import { VFileRemote } from './VFile';

// TextureJSON
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
