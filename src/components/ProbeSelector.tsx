import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import {
  materialSelectedAtom,
  ProbeAtom,
  wallOptionAtom,
} from 'src/scripts/atoms';
import { prepareWalls } from 'src/scripts/atomUtils';
import { applyProbeReflectionProbe } from 'src/scripts/vthree/Material';
import { THREE } from 'VTHREE';

const MultiProbeSelector = ({
  material,
  useWall,
}: {
  material: THREE.Material;
  useWall: boolean;
}) => {
  const wallInfo = useAtomValue(wallOptionAtom); // 벽 정보가 바뀔때마다 리렌더

  const probes = useAtomValue(ProbeAtom);
  const initialProbeIds = material.vUserData.probeIds;
  if (!initialProbeIds) {
    throw new Error('MultiProbeSelector must have probeIds');
  }

  const [probeSelections, setProbeSelections] =
    useState<string[]>(initialProbeIds);

  useEffect(() => {
    material.vUserData.probeIds = [...probeSelections];

    if (probeSelections.length > 0) {
      const walls = useWall ? prepareWalls(wallInfo) : undefined;
      // console.log('applyMultiProbeOnMaterial:', walls);
      // applyMultiProbeOnMaterial(material, probes, probeSelections, walls);
    }
  }, [probeSelections, useWall]);

  return (
    <div className="grid grid-cols-3 gap-1">
      {probes.map(p => {
        // checkbox
        const checked = probeSelections.includes(p.getId());
        const toggle = () => {
          if (checked) {
            setProbeSelections(probeSelections.filter(id => id !== p.getId()));
          } else {
            setProbeSelections([...probeSelections, p.getId()]);
          }
        };
        return (
          <div
            className="flex items-center"
            key={`probe-selector-${material.uuid}-${p.getId()}}`}
          >
            <input type="checkbox" checked={checked} onChange={toggle}></input>
            <label onClick={toggle}>{p.getName()}</label>
          </div>
        );
      })}
    </div>
  );
};

const compareStringArray = (l: string[], r: string[]) => {
  // sort and compare every element
  if (l.length !== r.length) return false;
  const sortedL = l.slice().sort();
  const sortedR = r.slice().sort();
  for (let i = 0; i < sortedL.length; i++) {
    if (sortedL[i] !== sortedR[i]) return false;
  }
  return true;
};

const ProbeSelector = ({ material }: { material: THREE.Material }) => {
  const selectedMaterial = useAtomValue(materialSelectedAtom);
  const probes = useAtomValue(ProbeAtom);
  const wallInfo = useAtomValue(wallOptionAtom); // 벽 정보가 바뀔때마다 리렌더
  const [probeIntensity, setProbeIntensity] = useState<number>(
    material.uniform.uProbeIntensity?.value ?? 1.0,
  );
  const [probeContrast, setProbeContrast] = useState<number>(
    material.uniform.uProbeContrast?.value ?? 1.0,
  );

  const [useWall, setUseWall] = useState<boolean>(
    material.vUserData.probeType === 'multiWall',
  );

  if (!material.vUserData.probeIds) {
    material.vUserData.probeIds = [];
  }

  const initialProbeIds = material.vUserData.probeIds;

  const [probeSelections, setProbeSelections] =
    useState<string[]>(initialProbeIds);

  if (!material) {
    return null;
  }

  const onWallCheck = (checked: boolean) => {
    setUseWall(checked);
    if (checked) {
      material.vUserData.probeType = 'multiWall';
    } else {
      material.vUserData.probeType = 'multi';
    }
  };

  const noWall = useWall && wallInfo.walls.length === 0;

  return (
    <section className="w-full p-3 box-border border-gray-500 border-[1px] rounded-lg">
      <div className="flex justify-between mb-3">
        <strong>프로브</strong>
        <div className="flex">
          {noWall && <span className="text-red-500">벽없음</span>}
          <input
            type="checkbox"
            checked={useWall}
            onChange={e => {
              onWallCheck(e.target.checked);
            }}
          ></input>
          <label
            onClick={() => {
              onWallCheck(!useWall);
            }}
          >
            프로브 벽사용
          </label>
        </div>
      </div>

      {probes.length === 0 ? (
        <span>프로브 없음</span>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1">
            {probes.map(p => {
              // checkbox
              const checked = probeSelections.includes(p.getId());
              const toggle = () => {
                if (noWall) {
                  return;
                }
                if (checked) {
                  setProbeSelections(
                    probeSelections.filter(id => id !== p.getId()),
                  );
                } else {
                  setProbeSelections([...probeSelections, p.getId()]);
                }
              };
              return (
                <div
                  className="flex items-center"
                  key={`probe-selector-${material.uuid}-${p.getId()}}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={toggle}
                    disabled={noWall}
                  ></input>
                  <label onClick={toggle}>{p.getName()}</label>
                </div>
              );
            })}
          </div>
          <div className="w-full mt-3 flex justify-between">
            <div className="">
              <div className="flex items-center">
                <label>강도</label>
                <input
                  className="w-[100px]"
                  value={probeIntensity}
                  onChange={e => {
                    if (
                      typeof material.uniform.uProbeIntensity !== 'undefined'
                    ) {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setProbeIntensity(value);
                        material.uniform.uProbeIntensity.value = value;
                        material.vUserData.probeIntensity = value;
                      }
                    }
                  }}
                  type="range"
                  min={0.0}
                  max={3.0}
                  step={0.005}
                ></input>
              </div>
              <div className="flex items-center">
                <label>대비</label>
                <input
                  className="w-[100px]"
                  value={probeContrast}
                  onChange={e => {
                    if (
                      typeof material.uniform.uProbeContrast !== 'undefined'
                    ) {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setProbeContrast(value);
                        material.uniform.uProbeContrast.value = value;
                        material.vUserData.probeContrast = value;
                      }
                    }
                  }}
                  type="range"
                  min={0.0}
                  max={3.0}
                  step={0.005}
                ></input>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const params: Parameters<THREE.Material['prepareProbe']>[0] =
                    {
                      probeCount: probeSelections.length,
                    };
                  if (useWall) {
                    params.wallCount = wallInfo.walls.length;
                  }
                  material.prepareProbe(params);
                  material.vUserData.probeIds = probeSelections;
                  material.vUserData.probeType = useWall
                    ? 'multiWall'
                    : 'multi';
                  material.needsUpdate = true;
                }}
              >
                프로브 셰이더 컴파일
              </button>

              <button
                onClick={() => {
                  material.vUserData.probeIds = probeSelections;
                  material.vUserData.probeType = useWall
                    ? 'multiWall'
                    : 'multi';

                  const selectedProbes = probes.filter(p =>
                    probeSelections.includes(p.getId()),
                  );

                  if (selectedProbes.length === 0) {
                    material.remove('probe');
                    material.needsUpdate = true;
                  } else {
                    const walls = useWall ? prepareWalls() : undefined;

                    const params: applyProbeReflectionProbe = {
                      probes: selectedProbes,
                      walls: walls,
                      probeIntensity: probeIntensity,
                      probeContrast: probeContrast,
                    };

                    material.apply('probe', params);

                    material.needsUpdate = true;
                  }
                }}
              >
                프로브 적용
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default ProbeSelector;
