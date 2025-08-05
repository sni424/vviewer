import { useAtomValue } from 'jotai';
import { useRef, useState } from 'react';
import { ProbeAtom, threeExportsAtom } from 'src/scripts/atoms';
import {
  renderProbesToPMREM,
  savePMREMTextureAsPNG,
} from 'src/scripts/probeUtils';
import { THREE } from 'VTHREE';

export default function MergedProbe() {
  const probes = useAtomValue(ProbeAtom);
  const { gl, scene } = useAtomValue(threeExportsAtom)!;
  const probeVersion = useRef(0);
  const [pmremTexture, setPmremTexture] =
    useState<THREE.WebGLRenderTarget<THREE.Texture> | null>(null);

  const handleMerge = () => {
    const cubeResolution = 512;
    const pmremResolution = 2048;

    const pmremRT = renderProbesToPMREM({
      probes,
      gl,
      scene,
      cubeResolution,
      pmremResolution,
    });
    setPmremTexture(pmremRT);
    const texture = pmremRT.texture;

    scene.traverse(o => {
      if (o.asMesh.isMesh) {
        o.asMesh.matStandard.applyProbe({
          probes: probes,
          pmremTexture: {
            texture,
            // tileSize: 4, // 4*4
            resolution: pmremResolution, // 1024를 4*4로 나눴다는 뜻
          },
        });
        o.asMesh.matStandard.setDefine('PROBE_VERSION', probeVersion.current);
        // o.asMesh.matStandard.metalness = 1.0;
        // o.asMesh.matStandard.roughness = 0.0;
        o.asMesh.matStandard.needsUpdate = true;
        console.log('Update : ', o.name);
      }
    });
    probeVersion.current += 1;
  };

  if (probes.length === 0) {
    return <button disabled>프로브 X</button>;
  }

  return (
    <>
      <button onClick={handleMerge}>프로브 머지</button>
      <button
        disabled={!pmremTexture}
        onClick={() => {
          if (pmremTexture) {
            savePMREMTextureAsPNG(gl, pmremTexture, 'pmrem_result.png');
          }
        }}
      >
        PMREM 저장
      </button>
    </>
  );
}
