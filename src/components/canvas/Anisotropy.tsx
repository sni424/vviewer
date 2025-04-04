import { useThree } from '@react-three/fiber';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { anisotropyAtom } from 'src/scripts/atoms';
import { THREE } from 'VTHREE';

const Anisotropy = () => {
  const anisotropyValue = useAtomValue(anisotropyAtom);
  const { scene, gl } = useThree();
  useEffect(() => {
    if (scene) {
      scene.traverseAll(child => {
        if (child instanceof THREE.Mesh) {
          const material = child.material;
          if (material.map) {
            const map = material.map;
            map.anisotropy = anisotropyValue;
            map.generateMipmaps = true;
            map.needsUpdate = true;
          }
        }
      });
    }
  }, [anisotropyValue]);

  return null;
};

export default Anisotropy;
