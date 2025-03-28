import { useAtom, useAtomValue } from 'jotai/index';
import { useEffect, useState } from 'react';
import { v4 } from 'uuid';
import {
  cameraSettingAtom,
  DPAtom,
  lastCameraInfoAtom,
  orbitSettingAtom,
  ProbeAtom,
  setAtomValue,
  threeExportsAtom,
} from '../scripts/atoms.ts';
import { loadProbes } from '../scripts/atomUtils.ts';
import ReflectionProbe, {
  ReflectionProbeJSON,
} from '../scripts/ReflectionProbe.ts';
import { toggleDP } from '../scripts/utils.ts';
import { THREE } from '../scripts/vthree/VTHREE.ts';

const DPController = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const [dp, setDP] = useAtom(DPAtom);

  useEffect(() => {
    if (!threeExports) {
      return;
    }
    const { scene } = threeExports;
    if (scene) {
      toggleDP(scene, dp.on);
    }
  }, [dp.on, threeExports]);

  if (!threeExports) {
    return null;
  }

  return (
    <div className="w-full">
      <CustomCheckBox
        text="DP 보기"
        checked={dp.on}
        onChange={b => setDP(prev => ({ ...prev, on: b }))}
      />
    </div>
  );
};

const LMIntensityController = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const [lmIntensityValue, setlmIntensityValue] = useState(1);

  useEffect(() => {
    if (!threeExports) return;
  }, [threeExports]);
  if (!threeExports) {
    return null;
  }
  const { scene } = threeExports;

  return (
    <div className="flex w-full">
      <div className="mr-3">라이트맵 세기</div>
      <input
        className="flex-1 min-w-0"
        type="range"
        value={lmIntensityValue}
        onChange={e => {
          const allMeshes: THREE.Mesh[] = [];
          scene.traverse(child => {
            if (child instanceof THREE.Mesh) {
              allMeshes.push(child);
            }
          });
          allMeshes.forEach(mesh => {
            (mesh.material as THREE.Material).lightMapIntensity = parseFloat(
              e.target.value,
            );
          });
          setlmIntensityValue(parseFloat(e.target.value));
        }}
        min={0}
        max={10}
        step={0.1}
      ></input>
      <span className="ml-1">{lmIntensityValue}</span>
    </div>
  );
};

const ProbeController = () => {
  const threeExports = useAtomValue(threeExportsAtom);

  function callProbe() {
    if (!threeExports) {
      alert('아직 준비되지 않았습니다.');
      return;
    }

    const { scene, camera, gl } = threeExports;
    loadProbes().then(async res => {
      alert('probe Loaded');
      if (!ReflectionProbe.isProbeJson(res)) {
        alert('Probe 불러오기 실패');
        console.warn(
          'probe.json FromJSON 을 할 수 없음 => ReflectionProbe.isProbeJson === false',
        );
        return;
      }
      const probeJsons = res as ReflectionProbeJSON[];
      const probes = await Promise.all(
        probeJsons.map(probeJson => {
          probeJson.resolution = 64; // 모바일은 128로 강제
          return new ReflectionProbe(gl, scene, camera).fromJSON(probeJson);
        }),
      );

      alert('probe Made');

      probes.forEach(probe => {
        probe.addToScene();
        alert(`${probe.getName()} probe added to scene`);
        probe.updateCameraPosition(probe.getCenter(), true);
        alert(`${probe.getName()} updated`);
        scene.traverse(node => {
          if (node instanceof THREE.Mesh) {
            const n = node as THREE.Mesh;
            const material = n.material as THREE.MeshStandardMaterial;
            if (material.vUserData.probeId === probe.getId()) {
              material.envMap = probe.getTexture();
              material.onBeforeCompile = probe.materialOnBeforeCompileFunc();
              material.needsUpdate = true;
            }
          }
        });
      });

      setAtomValue(ProbeAtom, probes);
    });
  }

  return (
    <button onClick={callProbe} disabled={!threeExports}>
      프로브 불러오기
    </button>
  );
};

const CameraController = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const [lastCameraInfo, setLastCameraInfo] = useAtom(lastCameraInfoAtom);
  const [cameraSetting, setCameraSetting] = useAtom(cameraSettingAtom);
  const [orbit, setOrbit] = useAtom(orbitSettingAtom);

  useEffect(() => {
    if (!threeExports) {
      return;
    }
    const { camera } = threeExports;

    camera.position.y = cameraSetting.cameraY;
    camera.updateProjectionMatrix();
    setLastCameraInfo(pre => ({
      ...pre,
      matrix: camera.matrix.toArray(),
    }));
  }, [cameraSetting.cameraY, threeExports]); // cameraY 값만 감지

  const { camera } = threeExports || {};

  return (
    <div>
      <strong>카메라 설정</strong>
      <div className="pl-1">
        <CustomCheckBox
          text="Orbit Control"
          checked={orbit.enabled}
          onChange={b =>
            setOrbit(pre => ({
              ...pre,
              enabled: b,
            }))
          }
        />
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <label>카메라 높이</label>
          <input
            style={{
              boxSizing: 'border-box',
              width: '40%',
              textAlign: 'right',
            }}
            type="number"
            step={0.1}
            value={cameraSetting.cameraY}
            onChange={e => {
              const newY = Number(parseFloat(e.target.value).toFixed(2)) || 0;
              setCameraSetting(pre => ({
                ...pre,
                cameraY: newY,
              }));
            }}
          />
        </div>
        <button
          className="w-full mt-2"
          onClick={() => {
            if (threeExports.camera.type === 'PerspectiveCamera') {
              camera.position.set(1, cameraSetting.cameraY, 1);
              // 목표 방향 계산
              const target = new THREE.Vector3(1, cameraSetting.cameraY, 1);
              const direction = target.clone().sub(camera.position).normalize();

              // 카메라의 "앞 방향"(`-Z`)을 목표 방향으로 회전
              const quaternion = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, -1), // 기본 카메라의 앞 방향
                direction,
              );

              // 카메라의 회전값 적용
              camera.quaternion.copy(quaternion);
            } else {
              threeExports.set(state => {
                const perCam = new THREE.PerspectiveCamera(
                  75,
                  window.innerWidth / window.innerHeight,
                  0.1,
                  1000,
                );
                perCam.position.set(1, cameraSetting.cameraY, 1);

                const target = new THREE.Vector3(1, cameraSetting.cameraY, 1);
                const direction = target
                  .clone()
                  .sub(perCam.position)
                  .normalize();

                // 카메라의 "앞 방향"(`-Z`)을 목표 방향으로 회전
                const quaternion = new THREE.Quaternion().setFromUnitVectors(
                  new THREE.Vector3(0, 0, -1), // 기본 카메라의 앞 방향
                  direction,
                );

                // 카메라의 회전값 적용
                perCam.quaternion.copy(quaternion);
                perCam.updateProjectionMatrix();
                threeExports.camera = perCam;
                return {
                  ...state,
                  camera: perCam,
                };
              });
            }
          }}
        >
          카메라 위치 초기화
        </button>
      </div>
    </div>
  );
};

const MobileSimplePanel = () => {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 2,
        maxWidth: 180,
      }}
    >
      {open ? (
        <section className="bg-gray-300 w-full p-2">
          <div className="w-full flex items-center justify-between pb-1 mb-2 border-b border-gray-500">
            <strong>컨트롤 패널</strong>
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setOpen(false);
              }}
            >
              X
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div>
              <strong>기본 설정</strong>
              <div className="pl-1">
                <DPController></DPController>
                <LMIntensityController></LMIntensityController>
              </div>
            </div>
            <CameraController />
            {/*<BloomOption></BloomOption>*/}
            {/*<ToneMappingOption></ToneMappingOption>*/}
            <ProbeController />
          </div>
        </section>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'end',
            cursor: 'pointer',
            border: '1px solid',
            borderColor: '#646464',
            padding: '4px 8px',
            marginRight: '8px',
            marginTop: '8px',
            backgroundColor: 'gray',
          }}
          onClick={() => {
            setOpen(true);
          }}
        >
          패널
        </div>
      )}
    </div>
  );
};

type CustomCheckBoxProps = {
  text: string;
  checked: boolean;
  onChange: (b: boolean) => void;
};

const CustomCheckBox = ({
  text = '인풋',
  checked = false,
  onChange = () => {},
}: CustomCheckBoxProps) => {
  const SERIALIZED_ID = v4();
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>{text}</span>
        <div className="wrapper">
          <input
            type="checkbox"
            className="switch"
            id={SERIALIZED_ID}
            checked={checked}
            onChange={event => {
              onChange(event.target.checked);
            }}
          />
          <label htmlFor={SERIALIZED_ID} className="switch_label">
            <span className="onf_btn"></span>
          </label>
        </div>
      </div>
    </>
  );
};

export default MobileSimplePanel;
