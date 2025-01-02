import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { v4 } from 'uuid';
import {
  ProbeAtom,
  selectedAtom,
  threeExportsAtom,
  useModal,
} from '../scripts/atoms.ts';
import ReflectionProbe from '../scripts/ReflectionProbe.ts';
import { THREE } from '../scripts/VTHREE.ts';
import './probe.css';

const ProbeInfo = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);

  if (!threeExports) {
    return null;
  }

  const { scene, gl, camera } = threeExports;

  function addProbe() {
    const probe = new ReflectionProbe(gl, scene, camera);
    probe.addToScene();
    setProbes(prev => [...prev, probe]);
  }

  function importProbe() {
    const input = document.createElement('input');
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0]; // 선택된 파일 가져오기

      if (!file) return;

      const reader = new FileReader();

      // 3. 파일 읽기 완료 후 처리
      reader.onload = () => {
        try {
          const result = reader.result as string;
          const jsonObject = JSON.parse(result); // JSON 문자열을 객체로 변환
          if (!ReflectionProbe.isProbeJson(jsonObject)) {
            alert('올바르지 않은 JSON 파일 형식입니다.');
            return;
          }
          const newProbe = new ReflectionProbe(gl, scene, camera).fromJSON(
            jsonObject,
          );
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
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <button
          style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
          onClick={addProbe}
        >
          + 새 프로브 생성
        </button>
        <button
          style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
          onClick={importProbe}
        >
          JSON 으로부터 받아오기
        </button>
        {probes.length > 0 && (
          <button
            style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
            onClick={updateAllProbes}
          >
            프로브 전체 업데이트
          </button>
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
  const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);
  const [showProbe, setShowProbe] = useState<boolean>(probe.getShowProbe());
  const [showControls, setShowControls] = useState<boolean>(
    probe.getShowControls(),
  );
  const [autoUpdate, setAutoUpdate] = useState<boolean>(false);
  const setSelecteds = useSetAtom(selectedAtom);
  const [mesh, setMesh] = useState<THREE.Mesh>();
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const { openModal, closeModal } = useModal();

  useEffect(() => {
    setMesh(probe.getBoxMesh());
    setImageData(probe.getImageData());
  }, [probe]);

  useEffect(() => {
    probe.setAutoUpdate(autoUpdate);
  }, [autoUpdate]);

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

    return () => {
      document.removeEventListener('probeMesh-changed', () => {});
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
    probe.removeFromScene();
    setProbes(prev => prev.filter(p => p.getId() !== probe.getId()));
  }

  function copyProbe() {
    const json = probe.toJSON();
    // 새로 만들어야 하므로 겹치지 않게 ID, box 위치 변동
    json.id = v4();
    json.center[0] = json.center[0] + 1;
    json.center[2] = json.center[2] + 1;
    const newProbe = new ReflectionProbe(gl, scene, camera).fromJSON(json);
    newProbe.addToScene();
    setProbes(prev => [...prev, newProbe]);
  }

  function showEffectedMeshes() {
    setSelecteds([]);
    const effectedMeshes = probe.getEffectedMeshes();
    const emUUIDs = effectedMeshes.map(mesh => {
      return mesh.uuid;
    });
    setSelecteds(emUUIDs);
  }

  function exportProbe() {
    const json = probe.toJSON();
    downloadObjectJsonFile(json, `probe_${probe.getId()}.json`);
  }

  async function exportEnv() {}

  return (
    <div className="probe-document">
      <div className="probe">
        <span className={`probeId`}>
          프로브 #{probes.findIndex(p => p.getId() === probe.getId()) + 1}
        </span>
        <span className="probeId" style={{ fontSize: 10, marginLeft: '4px' }}>
          {probe.getId()}
        </span>
        <button className="deleteButton" onClick={() => deleteProbe(probe)}>
          x
        </button>
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
          <span>자동 업데이트</span>
          <input
            className="on-off"
            type="checkbox"
            checked={autoUpdate}
            onChange={e => {
              setAutoUpdate(e.target.checked);
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
          onClick={showEffectedMeshes}
        >
          적용된 메시 보기
        </button>
        <button
          style={{
            fontSize: 12,
            padding: '4px 8px',
            cursor: 'pointer',
          }}
          onClick={exportProbe}
        >
          JSON 으로 추출
        </button>
        <button
          style={{
            fontSize: 12,
            padding: '4px 8px',
            cursor: 'pointer',
          }}
          onClick={exportEnv}
        >
          EXR 추출
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
          {imageData ? (
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
    if (canvasRef.current) {
      canvasRef.current.width = 60;
      canvasRef.current.height = 60;
      canvasRef.current
        .getContext('2d')
        ?.drawImage(probe.getCanvas(), 0, 0, 60, 60);
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
      <canvas className="w-full h-full cursor-pointer" ref={canvasRef}></canvas>
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
        ?.drawImage(probe.getCanvas(), 0, 0, maxWidth, maxHeight);
    }
  }, [probe]);

  return (
    <div className="h-full">
      <canvas className="w-full h-full cursor-pointer" ref={canvasRef}></canvas>
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
