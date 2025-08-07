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
  const [iteration, setIteration] = useState(1);

  const handleMerge = () => {
    const start = performance.now();
    for (let i = 0; i < iteration; ++i) {
      // const cubeResolution = i < iteration - 1 ? 64 : 256;
      // const pmremResolution = i < iteration - 1 ? 256 : 1024;
      const cubeResolution = 256;
      const pmremResolution = 1024;

      const pmremRT = renderProbesToPMREM({
        probes,
        gl,
        scene,
        cubeResolution,
        pmremResolution,
      });
      setPmremTexture(pmremRT);
      const texture = pmremRT.texture;

      const probeOption = {
        probes: probes,
        texture,
        resolution: pmremResolution,
      };
      scene.traverse(o => {
        if (o.asMesh.isMesh) {
          o.asMesh.matStandard.applyProbe(probeOption);
          o.asMesh.matStandard.setDefine('PROBE_VERSION', probeVersion.current);
          // o.asMesh.matStandard.metalness = 1.0;
          // o.asMesh.matStandard.roughness = 0.0;
          o.asMesh.matStandard.needsUpdate = true;
          // console.log('Update : ', o.name);
        }
      });
      probeVersion.current += 1;

      console.log(`[${i + 1}] ${performance.now() - start}ms`);
    }

    console.log(
      `Merged ${probes.length} probes in ${performance.now() - start}ms`,
    );
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
      <span>반복 횟수: {iteration}</span>
      <input
        type="number"
        value={iteration}
        onChange={e => {
          const value = Number(e.target.value);
          if (e.target.value.trim().length > 0 && !isNaN(value)) {
            setIteration(value);
          }
        }}
        min={1}
        max={10}
      />
    </>
  );
}
