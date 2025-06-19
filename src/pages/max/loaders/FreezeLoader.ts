import * as THREE from 'VTHREE';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import VTextureLoader from 'src/scripts/loaders/VTextureLoader.ts';
import type { RootState } from '@react-three/fiber';

const FreezeLoader = () => {};

export type LightMapQuality = 0.5 | 1 | 2 | 4;
const layers = ['dp1', 'dp2', 'layer1', 'layer2', 'layer3', 'layer4'] as const;
export type MaxLayers = typeof layers[number];

const INNER_CACHE = new Map<LightMapQuality, Record<MaxLayers, THREE.Texture>>();

function typedFromEntries<K extends string | number | symbol, V>(
  entries: [K, V][]
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}

async function callLightMapsWithQuality(
  threeExports: RootState,
  quality: LightMapQuality,
  force?: boolean,
) {
  if (force) {
    INNER_CACHE.delete(quality);
  }
  if (INNER_CACHE.has(quality)) {
    return INNER_CACHE.get(quality);
  }
  const suffix = `_VRayRawTotalLightingMap_${quality}K_denoised.hdr`;
  const folderName = `denoised_${quality}k`;
  const lightMapURL = `${MaxConstants.base}lightmaps/final`;

  const mapsToCall = typedFromEntries(
    await Promise.all(
      layers.map(async layer => {
        const fileName = layer + suffix;
        const url = `${lightMapURL}/${folderName}/${fileName}`;
        const tex = await VTextureLoader.loadAsync(url, threeExports);
        tex.flipY = true;
        tex.needsUpdate = true;
        return [layer, tex]; // [key, value] 형태로 반환
      }),
    ),
  ) as Record<MaxLayers, THREE.Texture>;

  INNER_CACHE.set(quality, mapsToCall);
  return mapsToCall;
}

export { callLightMapsWithQuality };
