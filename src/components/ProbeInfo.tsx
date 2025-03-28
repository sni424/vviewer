import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { v4 } from 'uuid';
import {
  getAtomValue,
  ProbeAtom,
  selectedAtom,
  setAtomValue,
  threeExportsAtom,
  useModal,
  useToast,
} from '../scripts/atoms.ts';
import {
  loadProbeApplyInfos,
  loadProbes,
  threes,
  uploadJson,
} from '../scripts/atomUtils.ts';
import { applyMultiProbe } from '../scripts/probeUtils.ts';
import ReflectionProbe, {
  ReflectionProbeJSON,
  ReflectionProbeResolutions,
} from '../scripts/ReflectionProbe.ts';
import {
  applyProbeOnMaterial,
  listFilesFromDrop,
  loadHDRTexture,
  loadPNGAsENV,
  splitExtension,
} from '../scripts/utils.ts';
import { THREE } from '../scripts/vthree/VTHREE.ts';
import { ProbeTypes } from '../types.ts';
import './probe.css';

const uploadProbes = async () => {
  const probes = getAtomValue(ProbeAtom);
  const toJSON = await Promise.all(probes.map(probe => probe.toJSON()));

  uploadJson('probe.json', toJSON)
    .then(res => res.json())
    .then(res => {
      if (res?.success === true) {
        alert('업로드 완료');
      } else {
        throw res;
      }
    })
    .catch(err => {
      console.log(err);
      alert('업로드 실패');
    });
};

const ProbeInfo = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);
  const [probeEditMode, setProbeEditMode] = useState<boolean>(false);
  const { openToast, closeToast } = useToast();
  const [lastCamera, setLastCamera] = useState<{
    matrix: THREE.Matrix4;
    fov: number;
  } | null>(null);
  if (!threeExports) {
    return null;
  }
  const globalPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 5);
  const { scene, gl, camera } = threeExports;
  const { openModal } = useModal();

  const importProbes = async () => {
    const threeExports = threes();

    if (!threeExports) {
      return;
    }
    const { scene, gl, camera } = threeExports;

    openToast('프로브 로딩중..', { autoClose: false });
    loadProbes().then(async res => {
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
          return new ReflectionProbe(gl, scene, camera).fromJSON(probeJson);
        }),
      );

      probes.forEach(probe => {
        probe.addToScene(true);
        // 250325 프로브 적용 정보 불러오기로 적용 시키기 위해 아래 코드 주석 처리 - 지우 => 적용하는 방식 변경
        // const texture = probe.getTexture(true);
        // const texture = probe.getRenderTargetTexture();
        // scene.traverse(node => {
        //   if (node instanceof THREE.Mesh) {
        //     const n = node as THREE.Mesh;
        //     const material = n.material as THREE.Material;
        //     if (material.vUserData.probeId === probe.getId()) {
        //       material.envMap = texture;
        //       material.updateEnvUniforms(probe.getCenter(), probe.getSize());
        //       material.needsUpdate = true;
        //     }
        //   }
        // });
      });

      setAtomValue(ProbeAtom, probes);
      closeToast();
    });
  };

  useEffect(() => {
    if (probeEditMode) {
      globalPlane.constant = 2.9;
      gl.localClippingEnabled = true;
      gl.clippingPlanes = [globalPlane];

      // Force Move Camera
      setLastCamera({ matrix: camera.matrix, fov: 75 });
    } else {
      gl.clippingPlanes = [];
      gl.localClippingEnabled = false;
    }
  }, [probeEditMode]);

  function addProbe() {
    const probe = new ReflectionProbe(gl, scene, camera);
    probe.addToScene();
    setProbes(prev => [...prev, probe]);
  }

  // From File
  function importProbe() {
    const input = document.createElement('input');
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0]; // 선택된 파일 가져오기

      if (!file) return;

      const reader = new FileReader();

      // 3. 파일 읽기 완료 후 처리
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const jsonObject = JSON.parse(result); // JSON 문자열을 객체로 변환
          if (!ReflectionProbe.isProbeJson(jsonObject)) {
            alert('올바르지 않은 JSON 파일 형식입니다.');
            return;
          }
          const newProbe = await new ReflectionProbe(
            gl,
            scene,
            camera,
          ).fromJSON(jsonObject as ReflectionProbeJSON);
          for (const probe of probes) {
            // 프로브가 완전히 겹쳤을 때 => 컨트롤이 오버랩 돼서 분리가 안됨
            const newProbeCenter = newProbe.getCenter();
            if (probe.getCenter().equals(newProbeCenter)) {
              newProbe.setCenter(
                newProbe.getCenter().add(new THREE.Vector3(0.5, 0, 0.5)),
              );
              newProbe.updateBoxMesh();
            }
            // ID 겹쳤을 때 => 동일 JSON 을 여러 번 불러오는 경우
            if (newProbe.getId() === probe.getId()) {
              newProbe.createNewId();
            }
          }
          newProbe.addToScene();
          newProbe.updateCameraPosition(newProbe.getCenter(), true);
          setProbes(pre => {
            return [...pre, newProbe];
          });
        } catch (error) {
          console.error('JSON 파일을 파싱하는 중 오류 발생:', error);
          alert('잘못된 JSON 파일입니다.');
        }
      };

      // 4. 파일 읽기 시작 (텍스트로 읽기)
      reader.readAsText(file);
    };
    input.type = 'file';
    input.accept = '.json';
    input.click();
  }

  function updateAllProbes() {
    probes.forEach(probe => {
      probe.updateCameraPosition(probe.getBoxMesh().position, true);
    });
  }

  function showProbeAppliedMaterials() {
    const probeMap = new Map<
      string,
      {
        probeIds?: string[];
        probeType?: ProbeTypes;
      }
    >();
    scene.traverse(o => {
      if (o.type === 'Mesh') {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as THREE.Material;
        const probeType = mat.vUserData.probeType;
        let obj: {
          probeIds?: string[];
          probeType?: ProbeTypes;
        } | null = null;
        if (probeType) {
          obj = { probeType };
          if (probeType === 'single') {
            obj.probeIds = [mat.vUserData.probeId].filter(s => s !== undefined);
          } else {
            obj.probeIds = mat.vUserData.probeIds;
          }
        } else if (mat.vUserData.probeId) {
          obj = {
            probeType: 'single',
            probeIds: [mat.vUserData.probeId],
          };
        }

        if (obj) {
          probeMap.set(mesh.name, obj);
        }
      }
    });
    const object = Object.fromEntries(probeMap);
    console.log(object);
    uploadJson('probe_apply.json', object)
      .then(res => res.json())
      .then(res => {
        if (res?.success === true) {
          alert('업로드 완료');
        } else {
          throw res;
        }
      })
      .catch(err => {
        console.log(err);
        alert('업로드 실패');
      });
  }

  function callProbeApplyInfo() {
    loadProbeApplyInfos()
      .then(
        (applyInfo: {
          [key: string]: {
            probeIds: string[];
            probeType: ProbeTypes;
          };
        }) => {
          console.log(applyInfo);
          const meshNames = Object.keys(applyInfo);
          const materials: THREE.Material[] = [];
          scene.traverse(o => {
            if (o.type === 'Mesh') {
              const mesh = o as THREE.Mesh;
              const mat = mesh.material as THREE.Material;
              if (meshNames.includes(mesh.name)) {
                const info = applyInfo[mesh.name];
                mat.vUserData.probeType = info.probeType;
                mat.vUserData.probeIds = info.probeIds;
                materials.push(mat);
              }
            }
          });

          materials.forEach(material => {
            const probeIds = material.vUserData.probeIds!!;
            const probeType = material.vUserData.probeType!!;
            const probesToApply = probes.filter(probe =>
              probeIds.includes(probe.getId()),
            );
            if (probesToApply.length > 0) {
              if (probeType === 'single') {
                applyProbeOnMaterial(material, probesToApply[0]);
              } else {
                applyMultiProbe(material, probesToApply);
              }
            }
          });
        },
      )
      .then(() => {
        for (let i = 0; i < 3; i++) {
          probes.forEach(probe => {
            probe.renderCamera(true);
          });
        }
      })
      .catch(err => {
        console.error(err);
        alert('불러오지 못했습니다.');
      });
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <section
        style={{
          width: '100%',
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
        }}
      >
        <button
          style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
          onClick={addProbe}
        >
          추가
        </button>
        <button
          style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
          onClick={importProbes}
        >
          불러오기
        </button>
        {probes.length > 0 && (
          <>
            <button
              style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
              onClick={uploadProbes}
            >
              업로드
            </button>
            <button
              style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
              onClick={updateAllProbes}
            >
              전체 업데이트
            </button>
            <button
              onClick={e => {
                setProbeEditMode(prev => !prev);
                // topView(!probeEditMode);
              }}
              style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
            >
              {probeEditMode ? '프로브 수정 모드 취소' : '프로브 수정 모드'}
            </button>
            <button
              style={{
                fontSize: 12,
                padding: '4px 8px',
                cursor: 'pointer',
              }}
              onClick={() => {
                openModal(() => <ProbeAllResolutionChanger />);
              }}
            >
              해상도 일괄 변경
            </button>
            <button
              onClick={showProbeAppliedMaterials}
              style={{ fontSize: 10 }}
            >
              프로브 적용 정보 업데이트
            </button>
            <button onClick={callProbeApplyInfo}>
              프로브 적용 정보 가져오기
            </button>
          </>
        )}
      </section>
      <section style={{ width: '100%' }}>
        {probes.map((probe, idx) => {
          return <ProbeComponent probe={probe} key={idx} />;
        })}
      </section>
    </div>
  );
};

export const ProbeComponent = ({ probe }: { probe: ReflectionProbe }) => {
  const threeExports = useAtomValue(threeExportsAtom);
  const [showNamePopup, setShowNamePopup] = useState<boolean>(false);
  const [isTextTruncated, setIsTextTruncated] = useState<boolean>(false);
  const nameRef = useRef<HTMLSpanElement>(null);
  const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);
  const [showProbe, setShowProbe] = useState<boolean>(probe.getShowProbe());
  const [showControls, setShowControls] = useState<boolean>(
    probe.getShowControls(),
  );
  const [name, setName] = useState<string>(probe.getName());
  const [resolution, setResolution] = useState<ReflectionProbeResolutions>(
    probe.getResolution(),
  );
  const [autoUpdate, setAutoUpdate] = useState<boolean>(false);
  const setSelecteds = useSetAtom(selectedAtom);
  const [mesh, setMesh] = useState<THREE.Mesh>();
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const { openModal, closeModal } = useModal();
  const [isCustom, setIsCustom] = useState<boolean>(probe.isUseCustomTexture());
  const [isActive, setIsActive] = useState<boolean>(probe.isActive);

  useEffect(() => {
    const nRC = nameRef.current;
    if (nRC) {
      const isTruncated = nRC.scrollWidth > nRC.clientWidth;
      setIsTextTruncated(isTruncated);
    }
  }, [name]);

  useEffect(() => {
    setMesh(probe.getBoxMesh());
    setImageData(probe.getImageData());
  }, [probe]);

  useEffect(() => {
    probe.setAutoUpdate(autoUpdate);
  }, [autoUpdate]);

  useEffect(() => {
    probe.setUseCustomTexture(isCustom);
  }, [isCustom]);

  useEffect(() => {
    // Probe Change Effect
    document.addEventListener('probeMesh-changed', event => {
      // @ts-ignore
      const { probeId } = event.detail;
      if (probe.getId() === probeId) {
        if (autoUpdate && probe) {
          setImageData(probe.getImageData());
        }
      }
    });

    document.addEventListener('probeName-changed', event => {
      setName(probe.getName());
    });

    document.addEventListener('probeResolution-changed', event => {
      setResolution(probe.getResolution());
    });

    document.addEventListener('probe-rendered', event => {
      setImageData(probe.getImageData());
    });

    window.addEventListener('scene-added', () => {
      probe.renderCamera(true);
    });

    return () => {
      document.removeEventListener('probeMesh-changed', () => {});
      document.removeEventListener('probeName-changed', () => {});
      document.removeEventListener('probeResolution-changed', () => {});
      document.removeEventListener('probe-rendered', () => {});
    };
  }, []);

  if (!threeExports) {
    return (
      <div style={{ width: '100%' }}>
        <p style={{ textAlign: 'center' }}>
          아직 Three.js 정보가 init 되지 않았습니다.
        </p>
      </div>
    );
  }
  const { scene, gl, camera } = threeExports;

  useEffect(() => {
    const mesh = probe.getBoxMesh();
    mesh.visible = showProbe;

    if (!showProbe) {
      if (showControls) {
        setShowControls(showProbe);
      }
    }

    probe.setShowProbe(showProbe);
  }, [showProbe]);

  useEffect(() => {
    probe.setShowControls(showControls);
  }, [showControls]);

  function deleteProbe(probe: ReflectionProbe) {
    if (confirm(`프로브 "${probe.getName()}"을 삭제하시겠습니까?`)) {
      probe.removeFromScene();
      setProbes(prev => prev.filter(p => p.getId() !== probe.getId()));
    }
  }

  async function copyProbe() {
    const json = await probe.toJSON();
    // 새로 만들어야 하므로 겹치지 않게 ID, box 위치 변동
    json.id = v4();
    json.center[0] = json.center[0] + 1; // x + 1
    json.center[2] = json.center[2] + 1; // z + 1
    const newProbe = await new ReflectionProbe(gl, scene, camera).fromJSON(
      json,
    );
    newProbe.addToScene();
    setProbes(prev => [...prev, newProbe]);
  }

  async function exportProbe() {
    const json = await probe.toJSON();
    downloadObjectJsonFile(json, `probe_${probe.getId()}.json`);
  }

  async function exportImage() {
    const images = await probe.getEnvImage();
    console.log(images);
    const id = probe.getId();
    const date = new Date().toISOString();
    if (Array.isArray(images)) {
      images.forEach(image => {
        const a = document.createElement('a');
        a.href = image;
        console.log(a);
        a.click();
      });
    } else {
      Object.entries(images).forEach(([key, value]) => {
        const url = URL.createObjectURL(value);

        // 다운로드 링크 생성
        const a = document.createElement('a');
        a.href = url;
        a.download = `${id}_${date}_${key}.png`;
        a.click();
      });
    }
  }

  function changeResolution() {
    openModal(() => <ProbeResolutionChanger probe={probe} />);
  }

  return (
    <div className="probe-document">
      <div className="probe">
        <div className="flex w-full justify-between items-center gap-x-3 relative">
          <div
            className="absolute bottom-2 left-0 mb-4 bg-gray-700 text-white rounded-md px-2 py-1"
            style={{
              display: showNamePopup && isTextTruncated ? 'block' : 'none',
            }}
          >
            {name}
          </div>
          <span
            className="probeId"
            onMouseOver={() => setShowNamePopup(true)}
            onMouseOut={() => setShowNamePopup(false)}
            ref={nameRef}
          >
            {name}
          </span>
          <div className="flex gap-x-3">
            <button
              onClick={() => {
                openModal(() => <ProbeNameEditor probe={probe} />);
              }}
            >
              이름 수정
            </button>
            <button className="deleteButton" onClick={() => deleteProbe(probe)}>
              x
            </button>
          </div>
        </div>
      </div>
      <div>
        <span>해상도 : {resolution}</span>
      </div>
      <div className="probe">
        <div style={{ fontSize: 11, display: 'flex', alignItems: 'center' }}>
          <span>프로브 보기</span>
          <input
            className="on-off"
            type="checkbox"
            checked={showProbe}
            onChange={e => {
              setShowProbe(e.target.checked);
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            marginLeft: 4,
          }}
        >
          <span>컨트롤 보기</span>
          <input
            className="on-off"
            type="checkbox"
            checked={showControls}
            onChange={e => {
              setShowControls(e.target.checked);
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            marginLeft: 4,
          }}
        >
          <span>직접 렌더</span>
          <input
            className="on-off"
            type="checkbox"
            checked={!isCustom}
            onChange={e => {
              setIsCustom(!e.target.checked);
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            marginLeft: 4,
          }}
        >
          <span>프로브 활성화</span>
          <input
            className="on-off"
            type="checkbox"
            checked={isActive}
            onChange={e => {
              setIsActive(e.target.checked);
              probe.isActive = e.target.checked;
            }}
          />
        </div>
      </div>
      <div className="probe" style={{ marginTop: '8px' }}>
        <button
          style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
          onClick={() => {
            probe.updateCameraPosition(probe.getBoxMesh().position, true);
            setImageData(probe.getImageData());
          }}
        >
          업데이트
        </button>
        <button
          style={{
            fontSize: 12,
            padding: '4px 8px',
            cursor: 'pointer',
          }}
          onClick={copyProbe}
        >
          복제
        </button>
        <button
          style={{
            fontSize: 12,
            padding: '4px 8px',
            cursor: 'pointer',
          }}
          onClick={exportProbe}
        >
          toJSON
        </button>
        <button
          style={{
            fontSize: 12,
            padding: '4px 8px',
            cursor: 'pointer',
          }}
          onClick={exportImage}
        >
          추출
        </button>
        <button
          style={{
            fontSize: 12,
            padding: '4px 8px',
            cursor: 'pointer',
          }}
          onClick={changeResolution}
        >
          해상도 변경
        </button>
      </div>
      <div className="probe-detail">
        <div
          style={{
            marginTop: 8,
            marginBottom: 8,
            padding: '0 4',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span>env Image : </span>
          {isCustom ? (
            <span>커스텀 텍스쳐</span>
          ) : imageData ? (
            <DocumentElementContainer probe={probe} />
          ) : (
            <span>아직 렌더되지 않음</span>
          )}
        </div>

        {mesh && <ProbeMeshInfo mesh={mesh} />}
      </div>
    </div>
  );
};

export const ProbeMeshInfo = ({ mesh }: { mesh: THREE.Mesh }) => {
  if (!mesh) {
    return null;
  }

  const [positionX, setPositionX] = useState<number>(mesh.position.x);
  const [positionY, setPositionY] = useState<number>(mesh.position.y);
  const [positionZ, setPositionZ] = useState<number>(mesh.position.z);

  const [scaleX, setScaleX] = useState<number>(mesh.scale.x);
  const [scaleY, setScaleY] = useState<number>(mesh.scale.y);
  const [scaleZ, setScaleZ] = useState<number>(mesh.scale.z);

  useEffect(() => {
    document.addEventListener('probeMesh-changed', event => {
      // @ts-ignore
      const { uuid, type, position, scale } = event.detail;
      if (mesh.uuid === uuid) {
        if (type === 'position') {
          setPositionX(position.x);
          setPositionY(position.y);
          setPositionZ(position.z);
        } else if (type === 'scale') {
          setScaleX(scale.x);
          setScaleY(scale.y);
          setScaleZ(scale.z);
        }
      }
    });

    return () => {
      document.removeEventListener('probeMesh-changed', () => {});
    };
  }, []);

  /**
   * Mesh 의 기준 position 은 그대로 유지하면서 scale 을 변화할 수 있게 offset 계산하는 함수
   * @param newScale THREE.Vector3
   * @returns number
   * **/
  function calculatePositionOffset(newScale: THREE.Vector3): number {
    const originalScale = mesh.scale.clone();
    const originalPosition = mesh.position.clone();

    let changedCoord: 'x' | 'y' | 'z';

    if (originalScale.x !== newScale.x) {
      changedCoord = 'x';
    } else if (originalScale.y !== newScale.y) {
      changedCoord = 'y';
    } else if (originalScale.z !== newScale.z) {
      changedCoord = 'z';
    } else {
      throw new Error('coord Input Error');
    }

    // Update Mesh Scale
    mesh.scale.copy(newScale);
    // Update Mesh Children Scale => Child Mesh 원본 스케일 유지
    mesh.children.forEach(child => {
      if (child.type === 'Mesh') {
        child.scale.copy(newScale.clone().revert());
      }
    });

    // Offset For Mesh Position Fix In Eyes
    const originalOffset = (originalScale[changedCoord] - 1) / 2;
    const newOffset = (newScale[changedCoord] - 1) / 2;

    return originalPosition[changedCoord] - originalOffset + newOffset;
  }

  useEffect(() => {
    mesh.position.set(positionX, positionY, positionZ);
  }, [positionX, positionY, positionZ]);

  return (
    <div style={{ marginTop: 8, paddingLeft: 8 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}
      >
        <span style={{ width: '120px', fontSize: '14px', marginRight: '8px' }}>
          박스 위치
        </span>
        <input
          type="number"
          step="0.01"
          value={positionX}
          onChange={event => {
            setPositionX(Number(event.target.value));
          }}
          style={{
            border: '1px solid gray',
            padding: '2px 6px',
            width: '50px',
            marginLeft: '0',
            fontSize: '12px',
            textAlign: 'right',
          }}
        />
        <input
          type="number"
          step="0.01"
          value={positionY}
          onChange={event => {
            setPositionY(Number(event.target.value));
          }}
          style={{
            border: '1px solid gray',
            padding: '2px 0px',
            width: '50px',
            marginLeft: 8,
            fontSize: '12px',
            textAlign: 'right',
          }}
        />
        <input
          type="number"
          step="0.01"
          value={positionZ}
          onChange={event => {
            setPositionZ(Number(event.target.value));
          }}
          style={{
            border: '1px solid gray',
            padding: '2px 6px',
            width: '50px',
            marginLeft: 8,
            fontSize: '12px',
            textAlign: 'right',
          }}
        />
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}
      >
        <span style={{ width: '120px', fontSize: '14px', marginRight: '8px' }}>
          박스 크기
        </span>
        <input
          type="number"
          step="0.01"
          value={scaleX}
          onChange={event => {
            const value = Number(event.target.value);
            const positionOffset = calculatePositionOffset(
              new THREE.Vector3(value, scaleY, scaleZ),
            );
            setScaleX(value);
            setPositionX(positionOffset);
          }}
          style={{
            border: '1px solid gray',
            padding: '2px 6px',
            width: '50px',
            marginLeft: '0',
            fontSize: '12px',
            textAlign: 'right',
          }}
        />
        <input
          type="number"
          step="0.01"
          value={scaleY}
          onChange={event => {
            const value = Number(event.target.value);
            const positionOffset = calculatePositionOffset(
              new THREE.Vector3(scaleX, value, scaleZ),
            );
            setScaleY(value);
            setPositionY(positionOffset);
          }}
          style={{
            border: '1px solid gray',
            padding: '2px 0px',
            width: '50px',
            marginLeft: 8,
            fontSize: '12px',
            textAlign: 'right',
          }}
        />
        <input
          type="number"
          step="0.01"
          value={scaleZ}
          onChange={event => {
            const value = Number(event.target.value);
            const positionOffset = calculatePositionOffset(
              new THREE.Vector3(scaleX, scaleY, value),
            );
            setScaleZ(value);
            setPositionZ(positionOffset);
          }}
          style={{
            border: '1px solid gray',
            padding: '2px 6px',
            width: '50px',
            marginLeft: 8,
            fontSize: '12px',
            textAlign: 'right',
          }}
        />
      </div>
    </div>
  );
};

const DocumentElementContainer = ({ probe }: { probe: ReflectionProbe }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { openModal } = useModal();

  useEffect(() => {
    document.addEventListener('probe-rendered', () => {
      if (canvasRef.current) {
        canvasRef.current
          .getContext('2d')
          ?.drawImage(probe.getCanvas()!, 0, 0, 60, 60);
      }
    });

    return () => {
      document.removeEventListener('probe-rendered', () => {});
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = 60;
      canvasRef.current.height = 60;
      canvasRef.current
        .getContext('2d')
        ?.drawImage(probe.getCanvas()!, 0, 0, 60, 60);
    }
  }, [probe]);

  return (
    <div
      style={{ cursor: 'pointer' }}
      onClick={() => {
        openModal(() => <ModalCanvasContainer probe={probe} />);
      }}
      className="w-[60px] h-[60px]"
    >
      <canvas
        className="w-full h-full cursor-pointer bg-white"
        ref={canvasRef}
      ></canvas>
    </div>
  );
};

const ModalCanvasContainer = ({ probe }: { probe: ReflectionProbe }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const maxHeight = window.innerHeight - 100;
      const maxWidth = window.innerWidth - 100;
      // aspect == 1
      canvasRef.current.width = maxWidth;
      canvasRef.current.height = maxHeight;
      canvasRef.current
        .getContext('2d')
        ?.drawImage(probe.getCanvas()!, 0, 0, maxWidth, maxHeight);
    }
  }, [probe]);

  return (
    <div className="h-full flex justify-center items-center">
      <canvas
        className="w-full h-full cursor-pointer bg-white"
        ref={canvasRef}
      ></canvas>
    </div>
  );
};

const ProbeNameEditor = ({ probe }: { probe: ReflectionProbe }) => {
  const [name, setName] = useState<string>(probe.getName());
  const probes = useAtomValue(ProbeAtom);
  const { closeModal } = useModal();

  function checkProbeAtomName() {
    return !probes.some(
      p => p.getName() === name && p.getId() !== probe.getId(),
    );
  }

  return (
    <div
      className="w-[30%] bg-white px-4 py-3"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="py-1 w-full mb-2">
        <strong style={{ fontSize: 16 }}>이름 수정</strong>
      </div>
      {/* Body */}
      <div className="w-full mb-2 flex flex-col gap-y-2">
        <div className="flex w-full gap-x-2 text-sm items-center">
          <span>기존 이름 : </span>
          <span>{probe.getName()}</span>
        </div>
        <div className="flex w-full gap-x-2 text-sm items-center">
          <span>변경할 이름 : </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              className="border border-black w-full py-1 px-2 rounded"
              type="text"
              value={name}
              onInput={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onChange={e => {
                setName(e.target.value);
              }}
            />
          </div>
        </div>
      </div>
      {/* Footer  */}
      <div className="flex w-full justify-end gap-x-2">
        <button className="py-1.5 px-3 text-md" onClick={closeModal}>
          취소
        </button>
        <button
          className="py-1.5 px-3 text-md"
          onClick={() => {
            if (!checkProbeAtomName()) {
              alert('이미 존재하는 이름입니다.');
              return;
            }
            probe.setName(name);
            closeModal();
          }}
        >
          변경
        </button>
      </div>
    </div>
  );
};

const ProbeResolutionChanger = ({ probe }: { probe: ReflectionProbe }) => {
  const resolutions = ReflectionProbe.getAvailableResolutions();
  const [resolution, setResolution] = useState<ReflectionProbeResolutions>(
    probe.getResolution(),
  );
  const { closeModal } = useModal();

  return (
    <div
      className="w-[30%] bg-white px-4 py-3"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="py-1 w-full mb-2">
        <strong style={{ fontSize: 16 }}>해상도 수정</strong>
      </div>
      <div className="w-full mb-2 flex flex-col gap-y-2">
        <div className="flex w-full gap-x-2 text-sm items-center">
          <span>해상도 : </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <select
              value={resolution}
              onChange={event =>
                setResolution(
                  Number(event.target.value) as ReflectionProbeResolutions,
                )
              }
            >
              {resolutions.map(resolution => (
                <option key={resolution} value={resolution}>
                  {resolution}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Footer  */}
      <div className="flex w-full justify-end gap-x-2">
        <button className="py-1.5 px-3 text-md" onClick={closeModal}>
          취소
        </button>
        <button
          className="py-1.5 px-3 text-md"
          onClick={() => {
            probe.setResolution(resolution);
            closeModal();
          }}
          disabled={probe.getResolution() === resolution}
        >
          변경
        </button>
      </div>
    </div>
  );
};

const ProbeAllResolutionChanger = () => {
  const resolutions = ReflectionProbe.getAvailableResolutions();
  const [resolution, setResolution] =
    useState<ReflectionProbeResolutions>(1024);
  const probes = useAtomValue(ProbeAtom);
  const { closeModal } = useModal();

  return (
    <div
      className="w-[30%] bg-white px-4 py-3"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="py-1 w-full mb-2">
        <strong style={{ fontSize: 16 }}>해상도 일괄 수정</strong>
      </div>
      <div className="w-full mb-2 flex flex-col gap-y-2">
        <div className="flex w-full gap-x-2 text-sm items-center">
          <span>해상도 : </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <select
              value={resolution}
              onChange={event =>
                setResolution(
                  Number(event.target.value) as ReflectionProbeResolutions,
                )
              }
            >
              {resolutions.map(resolution => (
                <option key={resolution} value={resolution}>
                  {resolution}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Footer  */}
      <div className="flex w-full justify-end gap-x-2">
        <button className="py-1.5 px-3 text-md" onClick={closeModal}>
          취소
        </button>
        <button
          className="py-1.5 px-3 text-md"
          onClick={() => {
            probes.map(probe => {
              if (probe.getResolution() !== resolution)
                probe.setResolution(resolution);
            });
            closeModal();
          }}
        >
          변경
        </button>
      </div>
    </div>
  );
};

const ProbeCustomTextureUploader = ({ probe }: { probe: ReflectionProbe }) => {
  const [mode, setMode] = useState<'select' | 'equirectangular' | 'cube'>(
    'select',
  );
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { closeModal } = useModal();

  function getBody() {
    let component;
    switch (mode) {
      case 'select':
        component = (
          <>
            <p style={{ textAlign: 'center', fontSize: 16 }}>
              커스텀 텍스쳐 업로드 모드를 선택하세요.
            </p>
            <div
              style={{
                display: 'flex',
                marginTop: 24,
                justifyContent: 'space-around',
              }}
            >
              <button
                style={{ fontSize: 16, padding: 32 }}
                onClick={() => {
                  setMode('equirectangular');
                }}
              >
                Equirectangular
              </button>
              <button
                style={{ fontSize: 16, padding: 32 }}
                onClick={() => {
                  setMode('cube');
                }}
              >
                CubeTexture
              </button>
            </div>
          </>
        );
        break;
      case 'equirectangular':
        component = (
          <CustomTextureEquirectangularMode
            setTexture={setTexture}
            setMode={setMode}
          />
        );
        break;
      case 'cube':
        component = (
          <CustomTextureCubeMode setTexture={setTexture} setMode={setMode} />
        );
        break;
    }

    return component;
  }

  return (
    <div
      className="w-[30%] bg-white px-4 py-3 relative"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="py-1 w-full mb-2">
        <strong style={{ fontSize: 16 }}>
          커스텀 텍스쳐 업로드 - {probe.getName()}
        </strong>
      </div>
      <div className="w-full mb-2 flex flex-col gap-y-2">
        <div className="w-full gap-x-2 text-sm">{getBody()}</div>
      </div>
      {/* Footer  */}
      <div className="flex w-full justify-end gap-x-2">
        <button className="py-1.5 px-3 text-md" onClick={closeModal}>
          취소
        </button>
        <button
          disabled={texture == null}
          className="py-1.5 px-3 text-md"
          onClick={() => {
            probe.setTexture(texture!!);
            closeModal();
          }}
        >
          변경
        </button>
      </div>
    </div>
  );
};

const CustomTextureEquirectangularMode = ({
  setTexture,
  setMode,
}: {
  setTexture: Dispatch<SetStateAction<THREE.Texture | null>>;
  setMode: Dispatch<SetStateAction<'select' | 'equirectangular' | 'cube'>>;
}) => {
  const threeExports = threes();
  if (!threeExports) {
    return null;
  }
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  async function onDrop(dtItems: DataTransferItemList) {
    const acceptedExtensions = ['.png', '.exr', '.hdr'];

    const files = await listFilesFromDrop(dtItems, acceptedExtensions);

    if (files.length > 1) {
      const alertMessage =
        '파일은 하나만 업로드 해주세요. 업로드한 파일 갯수 : ' + files.length;
      alert(alertMessage);
      return;
    }

    // Filter files by .gltf and .glb extensions
    const filteredFiles = files.filter(file =>
      acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)),
    );

    if (filteredFiles.length === 0) {
      alert('다음 확장자만 가능 : ' + acceptedExtensions);
      return;
    }

    setFile(files[0]);
  }

  useEffect(() => {
    console.log('file Updated : ', file);
    if (file) {
      const extension = splitExtension(file.name).ext;
      const url = URL.createObjectURL(file);
      setLoading(true);
      if (extension.endsWith('png')) {
        loadPNGAsENV(url, threeExports.gl).then(texture => {
          setTexture(texture);
          setLoading(false);
        });
      } else {
        loadHDRTexture(url).then(texture => {
          setTexture(texture);
          setLoading(false);
        });
      }
    }
  }, [file]);

  return (
    <div>
      <button
        onClick={() => {
          setTexture(null);
          setMode('select');
        }}
      >
        돌아가기
      </button>
      <p style={{ textAlign: 'center' }}>Equirectangular 모드</p>
      {file && (
        <div className="flex justify-center">
          <img
            style={{ width: '100%', height: 300, marginTop: 8 }}
            src={URL.createObjectURL(file)}
            alt=""
          />
        </div>
      )}
      <ImageFileDragDiv onDrop={onDrop} />
      {loading && (
        <div className="w-full absolute top-0 left-0 h-full flex justify-center items-center">
          Loading...
        </div>
      )}
    </div>
  );
};

const CustomTextureCubeMode = ({
  setMode,
}: {
  setTexture: Dispatch<SetStateAction<THREE.Texture | null>>;
  setMode: Dispatch<SetStateAction<'select' | 'equirectangular' | 'cube'>>;
}) => {
  const targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const;
  type TargetKeys = (typeof targets)[number];
  type ArrangedFiles = Record<TargetKeys, File | null>;
  const [arrangedFiles, setArrangedFiles] = useState<ArrangedFiles>({
    px: null,
    nx: null,
    py: null,
    ny: null,
    pz: null,
    nz: null,
  });

  async function onDrop(dtItems: DataTransferItemList) {
    const acceptedExtensions = ['.png'];

    const files = await listFilesFromDrop(dtItems, acceptedExtensions);

    // Filter files by .gltf and .glb extensions
    const filteredFiles = files.filter(file =>
      acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)),
    );

    if (filteredFiles.length === 0) {
      alert('다음 확장자만 가능 : ' + acceptedExtensions);
      return;
    }

    const arranged: ArrangedFiles = {
      ...arrangedFiles,
    };

    files.forEach(file => {
      const name = file.name;
      for (let i = 0; i < targets.length; i++) {
        if (name.endsWith(`_${targets[i]}.png`)) {
          arranged[targets[i]] = file;
          break;
        }
      }
    });

    setArrangedFiles(arranged);
  }

  return (
    <div>
      <button onClick={() => setMode('select')}>돌아가기</button>
      <strong>CubeTexture 모드</strong>
      <ImageFileDragDiv onDrop={onDrop} />
    </div>
  );
};

const ImageFileDragDiv = ({
  onDrop,
}: {
  onDrop: (dtItems: DataTransferItemList) => Promise<void>;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      await onDrop(event.dataTransfer.items);
      event.dataTransfer.clearData();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: '100%',
        height: '200px',
        border: isDragging ? '2px dashed black' : '1px solid black',
        padding: 16,
        borderRadius: 8,
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
      }}
    >
      <span className="text-gray-500">이 곳에 파일을 드래그 하세요.</span>
    </div>
  );
};

function scaleCanvas(
  originalCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
) {
  const scaledCanvas = document.createElement('canvas');
  const scaledContext = scaledCanvas.getContext('2d');
  scaledCanvas.id = 'scaled-canvas';

  scaledCanvas.width = targetWidth;
  scaledCanvas.height = targetHeight;

  if (scaledContext) {
    scaledContext.drawImage(originalCanvas, 0, 0, targetWidth, targetHeight);
  } else {
    throw new Error('Canvas Resizing 실패');
  }

  return scaledCanvas;
}

function downloadObjectJsonFile(obj: object, fileName: string = 'data.json') {
  // 1. 객체를 JSON 문자열로 변환
  const jsonString = JSON.stringify(obj, null, 2); // 들여쓰기 포함

  // 2. Blob 생성 (MIME 타입: application/json)
  const blob = new Blob([jsonString], { type: 'application/json' });

  // 3. Blob을 URL로 변환
  const url = URL.createObjectURL(blob);

  // 4. a 태그를 동적으로 생성하여 다운로드 트리거
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;

  // 5. a 태그 클릭 이벤트 트리거
  document.body.appendChild(a);
  a.click();

  // 6. a 태그 제거 및 URL 해제
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default ProbeInfo;
