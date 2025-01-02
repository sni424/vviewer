import { LookupTexture, LUT3dlLoader, LUTCubeLoader } from 'postprocessing';
import { Simulate } from 'react-dom/test-utils';
import { ENV } from '../../Constants.ts';
import * as THREE from '../../scripts/VTHREE.ts';
import load = Simulate.load;

const luts = new Map([
  ['neutral-2', null],
  ['neutral-4', null],
  ['neutral-8', null],
  ['png/bleach-bypass', 'png/bleach-bypass.png'],
  ['png/candle-light', 'png/candle-light.png'],
  ['png/cool-contrast', 'png/cool-contrast.png'],
  ['png/warm-contrast', 'png/warm-contrast.png'],
  ['png/desaturated-fog', 'png/desaturated-fog.png'],
  ['png/evening', 'png/evening.png'],
  ['png/fall', 'png/fall.png'],
  ['png/filmic1', 'png/filmic1.png'],
  ['png/filmic2', 'png/filmic2.png'],
  ['png/matrix-green', 'png/matrix-green.png'],
  ['png/strong-amber', 'png/strong-amber.png'],
  ['3dl/cinematic', '3dl/presetpro-cinematic.3dl'],
  ['cube/cinematic', 'cube/presetpro-cinematic.cube'],
  ['cube/django-25', 'cube/django-25.cube'],
]);

export const LUTPresets = [
  'neutral-2',
  'neutral-4',
  'neutral-8',
  'png/bleach-bypass',
  'png/candle-light',
  'png/cool-contrast',
  'png/warm-contrast',
  'png/desaturated-fog',
  'png/evening',
  'png/fall',
  'png/filmic1',
  'png/filmic2',
  'png/matrix-green',
  'png/strong-amber',
  '3dl/cinematic',
  'cube/cinematic',
  'cube/django-25',
] as const;

export type LUTPresets = (typeof LUTPresets)[number];

export async function getLUTTexture(
  key: LUTPresets,
): Promise<THREE.Texture | null> {
  const uri = luts.get(key);
  const lutURL = ENV.lut;
  if (!lutURL) {
    alert('.env에 환경변수를 설정해주세요, VITE_LUT_URL');
    return null;
  }
  if (uri) {
    const url = `${lutURL}/${uri}`;
    const extension = uri.substring(uri.lastIndexOf('.') + 1);
    console.log('url : ', url);
    let loader;
    if (extension === 'png') {
      loader = new THREE.TextureLoader();
    } else if (extension === 'cube') {
      loader = new LUTCubeLoader();
    } else if (extension === '3dl') {
      loader = new LUT3dlLoader();
    } else {
      alert('getLUTTexture(): Invalid Extension : ' + uri);
      return null;
    }

    const t = (await loader.loadAsync(url)) as THREE.Texture;

    if (extension === 'png') {
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.flipY = false;
    }

    return t;
  } else {
    // neutral-{number}
    const number = Number(key.substring(key.length - 1));
    if (!Number.isNaN(number)) {
      return LookupTexture.createNeutral(number);
    } else {
      alert('getLUTTexture Key Error : ' + key);
      return null;
    }
  }
}
