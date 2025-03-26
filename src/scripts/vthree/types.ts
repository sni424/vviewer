import type { Texture, WebGLProgramParametersWithUniforms } from "three";
import type { ProbeTypes } from "../../types";
import type { PlaneControlDirections } from "../CubePlaneControls";
import type ReflectionProbe from "../ReflectionProbe";
import type { ReflectionProbeJSON } from "../ReflectionProbe";

export interface ThreeUserData {
  lightMap?: string; // filename
  lightMapIntensity?: number;
  probe?: ReflectionProbe;
  isTransformControls?: boolean;
  isProbeMesh?: boolean;
  probeId?: string;
  probeIds?: string[];
  probeType?: ProbeTypes;
  probeMeshType?: 'box' | 'controls' | 'sphere' | 'helper' | 'plane-controls';
  probeControlDirection?: PlaneControlDirections;
  probes?: ReflectionProbeJSON[];
  hotspotIndex?: number;
  isExr?: boolean;
  mimeType?: 'image/ktx2' | 'probe-captured-image'; // ktx2압축시 달려있음
  modelType?: 'DP' | 'BASE';
  dpOnLightMap?: Texture;
  dpOffLightMap?: Texture;
  dpOnTextureFile?: string;
  dpOffTextureFile?: string;
  // optional
  dpOnLightMapIntensity?: number;
  dpOffLightMapIntensity?: number;
  isCustomEnvMap?: boolean;
  originalOpacity?: number;
  shader?: WebGLProgramParametersWithUniforms;
  isMobile?: boolean;
  originalColor?: string;
}