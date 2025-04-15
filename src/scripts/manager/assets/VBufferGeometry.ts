// three.js 타입 참조
// BufferGeometry.d.ts
// BufferAttribute.d.ts
// constants.d.ts

import { type THREE } from 'VTHREE';
import { VFileRemote } from './VFile';

interface GeometryGroup {
  /**
   * Specifies the first element in this draw call – the first vertex for non-indexed geometry, otherwise the first triangle index.
   * @remarks Expects a `Integer`
   */
  start: number;
  /**
   * Specifies how many vertices (or indices) are included.
   * @remarks Expects a `Integer`
   */
  count: number;
  /**
   * Specifies the material array index to use.
   * @remarks Expects a `Integer`
   */
  materialIndex?: number | undefined;
}

// usage types
const StaticDrawUsage = 35044 as const;
const DynamicDrawUsage = 35048 as const;
const StreamDrawUsage = 35040 as const;
const StaticReadUsage = 35045 as const;
const DynamicReadUsage = 35049 as const;
const StreamReadUsage = 35041 as const;
const StaticCopyUsage = 35046 as const;
const DynamicCopyUsage = 35050 as const;
const StreamCopyUsage = 35042 as const;
export type VBufferAttributeUsage =
  | typeof StaticDrawUsage
  | typeof DynamicDrawUsage
  | typeof StreamDrawUsage
  | typeof StaticReadUsage
  | typeof DynamicReadUsage
  | typeof StreamReadUsage
  | typeof StaticCopyUsage
  | typeof DynamicCopyUsage
  | typeof StreamCopyUsage;

export interface VBufferAttribute {
  itemSize: number;
  type: string;
  array: VFileRemote;
  normalized: boolean;

  name?: string;
  usage?: VBufferAttributeUsage;
}

export interface VInterleavedBufferAttribute {
  isInterleavedBufferAttribute: true;
  itemSize: number;
  data: VInterleavedBuffer;
  offset: number;
  normalized: boolean;
}

export interface VBufferGeometry {
  uuid: string;
  type: string;

  name?: string;
  userData?: Record<string, unknown>;

  data: {
    attributes: Record<string, VBufferAttribute | VInterleavedBufferAttribute>;

    index?: { type: string; array: VFileRemote };

    morphAttributes?: Record<
      string,
      (VBufferAttribute | VInterleavedBufferAttribute)[]
    >;
    morphTargetsRelative?: boolean;

    groups?: GeometryGroup[];

    boundingSphere?: { center: THREE.Vector3Tuple; radius: number };
  };
}

export interface VInterleavedBuffer {
  uuid: string;
  buffer: VFileRemote;
  type: string; //arraytype
  stride: number;
}
