import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import SkyBoxMesh from './SkyBoxMesh';
import * as THREE from 'VTHREE';
import { getVKTX2Loader } from '../../scripts/loaders/VKTX2Loader.ts';
import { useAtomValue } from 'jotai';
import { testAtom } from 'src/scripts/atoms.ts';

const SkyBox = () => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { gl } = useThree();
  const { useSkyBox } = useAtomValue(testAtom);

  useEffect(() => {
    const ktx2Loader = getVKTX2Loader(gl);
    ktx2Loader.load(
      'https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/models/scythian_tombs_puresky_2k.ktx',
      function (loadedTexture) {
        loadedTexture.mapping = THREE.EquirectangularReflectionMapping;
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.generateMipmaps = false;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.flipY = true;
        if (gl) {
          loadedTexture.anisotropy = gl.capabilities.getMaxAnisotropy();
        }

        setTexture(loadedTexture);
      },
      function () {
        // console.log('onProgress');
      },
      function (e) {
        console.error(e);
      },
    );
  }, []);

  if (!texture) return;

  return <>{useSkyBox && <SkyBoxMesh texture={texture} />}</>;
};

export default SkyBox;
