import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import { ProbeAtom, threeExportsAtom } from 'src/scripts/atoms';
import { CubeUVReflectionMapping, TextureLoader, THREE } from 'VTHREE';

export default function ApplyProbe() {
  const probes = useAtomValue(ProbeAtom);
  const { gl, scene } = useAtomValue(threeExportsAtom)!;
  const pmremTexture = useRef<Promise<THREE.Texture> | null>(null);
  const probeVersion = useRef(0);

  useEffect(() => {
    if (probes.length === 0) return;

    if (pmremTexture.current) return;

    pmremTexture.current = new Promise(resolve => {
      new TextureLoader().load('/pmrem_result.png', texture => {
        texture.mapping = CubeUVReflectionMapping;
        texture.name = 'PMREM.cubeUv';
        (texture as any).isPMREMTexture = true;
        resolve(texture);
      });
    });
  }, []);

  const applyProbe = () => {
    if (!pmremTexture.current) {
      console.warn('PMREM texture is not loaded yet.');
      return;
    }

    pmremTexture.current.then(texture => {
      scene.traverse(o => {
        if (o.asMesh.isMesh) {
          o.asMesh.matStandard.applyProbe({
            probes: probes,
            pmremTexture: {
              texture,
              // tileSize: 4, // 4*4
              resolution: 1024, // 1024를 4*4로 나눴다는 뜻
            },
          });
          o.asMesh.matStandard.setDefine('PROBE_VERSION', probeVersion.current);
          o.asMesh.matStandard.metalness = 1.0;
          o.asMesh.matStandard.roughness = 0.0;
          o.asMesh.matStandard.needsUpdate = true;
          console.log('Update : ', o.name);
        }
      });
      probeVersion.current += 1;
    });
  };

  if (probes.length === 0) {
    return <button disabled>프로브 X</button>;
  }

  return <button onClick={applyProbe}>프로브 적용</button>;
}
