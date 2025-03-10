import { useAtom, useAtomValue, WritableAtom } from 'jotai';
import useFiles from '../scripts/useFiles';
import {
  compressObjectToFile,
  formatNumber,
  getModelArrangedScene,
  groupInfo,
  isProbeMesh,
  isTransformControlOrChild,
  loadLatest,
  loadScene,
  saveScene,
  toNthDigit,
  uploadExrLightmap,
  uploadGainmap,
} from '../scripts/utils';

import { get, set } from 'idb-keyval';
import objectHash from 'object-hash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  __UNDEFINED__,
  AOMAP_INTENSITY_MAX,
  Layer,
  LIGHTMAP_INTENSITY_MAX,
} from '../Constants';
import { defaultSettings, loadSettings } from '../pages/useSettings.ts';
import {
  cameraMatrixAtom,
  DPAtom,
  DPCModeAtom,
  getAtomValue,
  lightMapAtom,
  lightMapContrastAtom,
  materialSettingAtom,
  postprocessAtoms,
  ProbeAtom,
  selectedAtom,
  threeExportsAtom,
  useBenchmark,
  useEnvParams,
  useModal,
  useToast,
} from '../scripts/atoms';
import { loadPostProcessAndSet, uploadJson } from '../scripts/atomUtils.ts';
import { VMaterial } from '../scripts/material/VMaterial.ts';
import ReflectionProbe from '../scripts/ReflectionProbe.ts';
import useFilelist from '../scripts/useFilelist';
import useStats, { StatPerSecond, VStats } from '../scripts/useStats.ts';
import VGLTFExporter from '../scripts/VGLTFExporter.ts';
import { Quaternion, THREE, Vector3 } from '../scripts/VTHREE';
import { BloomOption } from './canvas/Bloom.tsx';
import { BrightnessContrastOption } from './canvas/BrightnessContrast.tsx';
import { ColorLUTOption } from './canvas/ColorLUT.tsx';
import { ColorTemperatureOption } from './canvas/ColorTemperature.tsx';
import { FXAAOption } from './canvas/FXAA.tsx';
import { HueSaturationOption } from './canvas/HueSaturation.tsx';
import { SMAAOption } from './canvas/SMAA.tsx';
import { ToneMappingOption } from './canvas/ToneMapping.tsx';
import UploadPage from './UploadModal';

const useEnvUrl = () => {
  const [envUrl, setEnvUrl] = useState<string | null>(null);

  useEffect(() => {
    get('envUrl').then(url => {
      setEnvUrl(url);
    });
  }, []);
  return [envUrl, setEnvUrl] as const;
};

const S_k_t = (intensity: number, k: number, t: number, r: number) => {
  const x_exp = Math.pow(intensity, t);
  const term = x_exp - 1.0;
  const denominatorInv = 1.0 / (1.0 + Math.pow(term, k));
  return (1.0 - r) * denominatorInv + r;
};

function save(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link); // Firefox workaround, see #6594
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function saveString(text: string, filename: string) {
  save(new Blob([text], { type: 'text/plain' }), filename);
}

function saveArrayBuffer(buffer: ArrayBuffer, filename: string) {
  save(new Blob([buffer], { type: 'application/octet-stream' }), filename);
}

const CameraInfoSection = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const cameraMatrix = useAtomValue(cameraMatrixAtom);
  if (!threeExports) {
    return null;
  }

  const { scene, camera } = threeExports;
  const position = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3();
  cameraMatrix?.decompose(position, rotation, scale);
  return (
    <section style={{ marginTop: 16 }}>
      <strong>카메라</strong>
      {/* <select
                style={{ textTransform: "capitalize" }}
                value={cameraMode}
                onChange={(e) => {
                    // setEnv({ select: e.target.value as "none" | "preset" | "custom" });
                    setCameraMode(e.target.value as "perspective" | "iso");
                }}>
                <option value="perspective">투시</option>
                <option value="iso">아이소</option>
            </select> */}

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div>
          Position
          {/* <div style={{ paddingLeft: 8 }}>X: {toNthDigit(position.x, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Y: {toNthDigit(position.y, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Z: {toNthDigit(position.z, 4)}</div> */}
          <div style={{ paddingLeft: 8 }}>
            X:
            {camera.position.x.toFixed(2)}
          </div>
          <div style={{ paddingLeft: 8 }}>
            Y:
            {camera.position.y.toFixed(2)}
          </div>
          <div style={{ paddingLeft: 8 }}>
            Z:
            {camera.position.z.toFixed(2)}
          </div>
        </div>
        <div>
          Rotation
          {/* <div style={{ paddingLeft: 8 }}>X: {toNthDigit(rotationEuler.x, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Y: {toNthDigit(rotationEuler.y, 4)}</div>
            <div style={{ paddingLeft: 8 }}>Z: {toNthDigit(rotationEuler.z, 4)}</div> */}
          <div style={{ paddingLeft: 8 }}>
            X: {camera.rotation.x.toFixed(2)}
          </div>
          <div style={{ paddingLeft: 8 }}>
            Y: {camera.rotation.y.toFixed(2)}
          </div>
          <div style={{ paddingLeft: 8 }}>
            Z: {camera.rotation.z.toFixed(2)}
          </div>
        </div>
      </div>
    </section>
  );
};

const GeneralButtons = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const [hasSaved, setHasSaved] = useState(false);
  const { openModal, closeModal } = useModal();
  const { openToast, closeToast } = useToast();
  const navigate = useNavigate();
  const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);
  const [dpcMode, setDPCMode] = useAtom(DPCModeAtom);
  const dpcModalRef = useRef(null);
  const [dp, setDP] = useAtom(DPAtom);
  const { addBenchmark } = useBenchmark();

  // DPC Modal 모드에 따라 사이즈 변경
  useEffect(() => {
    const styles = {
      tree: {
        width: '20%',
        marginLeft: 'auto',
        marginBottom: 'auto',
      },
      file: {
        width: '80%',
        marginLeft: 0,
        marginBottom: 0,
      },
      select: {
        width: '35%',
        marginLeft: 0,
        marginBottom: 0,
      },
    };
    if (dpcModalRef.current) {
      const styleMode = styles['file'];
      Object.entries(styleMode).map(([key, value]) => {
        dpcModalRef.current.style[key] = value;
      });
    }
  }, [dpcModalRef.current, dpcMode]);

  const handleResetSettings = async () => {
    await defaultSettings();
    await loadSettings(); // Reload settings from IDB to update atoms
  };

  useEffect(() => {
    get('savedScene').then(val => {
      if (val) {
        setHasSaved(true);
      }
    });
  }, []);

  if (!threeExports) {
    return null;
  }

  const { scene, gl, camera } = threeExports;

  // Scene Export 전처리
  function onBeforeSceneExport(): { beforeDpStatus: boolean } {
    // 프로브 정보 Scene 에 담기
    // scene.vUserData.probes = probes.map(probe => probe.toJSON());
    const beforeDpStatus = dp.on;

    setDP(prev => ({ ...prev, on: true }));
    return {
      beforeDpStatus,
    };
  }

  // Scene Export 후처리
  function onAfterSceneExport({
    beforeDpStatus,
  }: {
    beforeDpStatus: boolean;
  }): void {
    // userData 에 들어간 probes 정보 삭제
    // delete scene.vUserData.probes;
    setDP(prev => ({ ...prev, on: beforeDpStatus }));
  }

  // Scene Load 전처리
  function onBeforeSceneLoad() {}

  // Scene Load 후처리
  function onAfterSceneLoad(loadedScene: THREE.Object3D) {
    checkProbeJson(loadedScene);
  }

  // Scene Load 시 ReflectionProbe Handle
  function checkProbeJson(loadedScene: THREE.Object3D) {
    const probeJsons = loadedScene.vUserData.probes;
    if (probeJsons) {
      probeJsons.forEach(async probeJson => {
        const newProbe = await new ReflectionProbe(gl, scene, camera).fromJSON(
          probeJson,
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
        loadedScene.traverse(child => {
          if (
            child.type === 'Mesh' &&
            child.vUserData.probeId === newProbe.getId()
          ) {
            const m = child as THREE.Mesh;
            const material = m.material as THREE.MeshStandardMaterial;
            material.envMap = newProbe.getTexture();
          }
        });
        setProbes(pre => {
          return [...pre, newProbe];
        });
      });
    }
  }

  return (
    <section
      style={{
        width: '100%',
        display: 'grid',
        gap: 8,
        gridTemplateColumns: '1fr 1fr 1fr',
      }}
    >
      <button
        onClick={() => {
          navigate('/mobile');
        }}
      >
        모바일
      </button>
      <button
        style={{ fontSize: 10 }}
        disabled={scene.children.length === 0}
        onClick={() => {
          const before = onBeforeSceneExport();
          new VGLTFExporter()
            .parseAsync(threeExports.scene, { binary: true })
            .then(result => {
              console.log('parse DoNE');
              if (result instanceof ArrayBuffer) {
                saveArrayBuffer(
                  result,
                  `scene-${new Date().toISOString()}.glb`,
                );
              } else {
                const output = JSON.stringify(result, null, 2);
                saveString(output, `scene-${new Date().toISOString()}.gltf`);
              }
              onAfterSceneExport(before);
            })
            .catch(err => {
              console.log('GLTFExporter ERROR : ', err);
              alert('GLTF 내보내기 중 오류 발생');
            });
        }}
      >
        GLB 내보내기
      </button>
      <button
        style={{ fontSize: 10 }}
        onClick={() => {
          // navigate("/upload");
          openModal(() => (
            <div
              style={{
                width: '80%',
                maxHeight: '80%',
                backgroundColor: '#ffffffcc',
                padding: 16,
                borderRadius: 8,
                boxSizing: 'border-box',
                position: 'relative',
                overflowY: 'auto',
              }}
            >
              <UploadPage></UploadPage>
            </div>
          ));
        }}
      >
        모델추가&업로드
      </button>
      <button
        style={{ fontSize: 10 }}
        onClick={() => {
          const before = onBeforeSceneExport();
          saveScene(scene)
            .then(() => {
              get('savedScene').then(val => {
                if (val) {
                  setHasSaved(true);
                  // 저장 후 삭제
                  onAfterSceneExport(before);
                  alert('저장되었습니다.');
                } else {
                  setHasSaved(false);
                  alert('크아악 저장하지 못했습니다.');
                }
              });
            })
            .catch(err => {
              console.log('씬 저장 실패 : ', err);
              alert('씬 저장 실패');
            });
        }}
      >
        씬 저장(Ctrl S)
      </button>
      <button
        style={{ fontSize: 10 }}
        onClick={() => {
          onBeforeSceneLoad();
          loadScene()
            .then(loaded => {
              if (loaded) {
                // Scene 추가
                scene.add(loaded);
                // ReflectionProbe 로드
                onAfterSceneLoad(loaded);
              }
            })
            .catch(() => {
              alert('씬 불러오기 실패');
            });
        }}
        disabled={!hasSaved}
      >
        씬 불러오기 Ctrl L
      </button>
      <button
        style={{ fontSize: 10 }}
        onClick={() => {
          saveString(
            JSON.stringify(getModelArrangedScene(scene).toJSON(), null, 2),
            `scene-${new Date().toISOString()}.json`,
          );
        }}
      >
        씬 json으로 내보내기
      </button>
      <button
        style={{ fontSize: 10 }}
        onClick={async () => {
          const uploadUrl = import.meta.env.VITE_UPLOAD_URL;
          if (!uploadUrl) {
            alert('.env에 환경변수를 설정해주세요, uploadUrl');
            return;
          }

          const before = onBeforeSceneExport();
          openToast('라이트맵 업로드 중...', { autoClose: false });
          Promise.all([
            uploadExrLightmap(threeExports.scene),
            uploadGainmap(threeExports.scene),
          ]).then(() => {
            openToast('GLB 업로드 중...', { autoClose: false, override: true });
            new VGLTFExporter()
              .parseAsync(threeExports.scene, { binary: true })
              .then(glbArr => {
                if (glbArr instanceof ArrayBuffer) {
                  console.log('before File Make');
                  const blob = new Blob([glbArr], {
                    type: 'application/octet-stream',
                  });
                  const file = new File([blob], 'latest.glb', {
                    type: 'model/gltf-binary',
                  });
                  const fd = new FormData();
                  fd.append('files', file);

                  // latest 캐싱을 위한 hash
                  const uploadHash = objectHash(new Date().toISOString());
                  const hashData = {
                    hash: uploadHash,
                  };
                  // convert object to File:
                  const hashFile = compressObjectToFile(
                    hashData,
                    'latest-hash',
                  );
                  const hashFd = new FormData();
                  hashFd.append('files', hashFile);
                  console.log('before Upload');
                  Promise.all([
                    fetch(uploadUrl, {
                      method: 'POST',
                      body: hashFd,
                    }),
                    fetch(uploadUrl, {
                      method: 'POST',
                      body: fd,
                    }),
                  ]).then(() => {
                    alert('업로드 완료');
                    onAfterSceneExport(before);
                    closeToast();
                  });
                } else {
                  console.error(
                    'VGLTFExporter GLB 처리 안됨, "binary: true" option 확인',
                  );
                  alert('VGLTFExporter 문제 발생함, 로그 확인');
                  closeToast();
                }
              });
          });
        }}
      >
        씬 업로드
      </button>
      <button
        onClick={() => {
          uploadExrLightmap(threeExports.scene).then(res => {
            alert('업로드 완료');
          });
        }}
      >
        라이트맵만 업로드
      </button>
      <button
        onClick={() => {
          openToast('업로드한 씬 불러오는 중..', { autoClose: false });
          loadLatest({
            threeExports,
            addBenchmark,
            dpOn: dp.on,
            closeToast,
          }).catch(e => {
            console.error(e);
            alert('최신 업로드 불러오기 실패');
            closeToast();
          });
        }}
      >
        업로드한 씬 불러오기
      </button>
      <button
        onClick={() => {
          handleResetSettings();
        }}
      >
        카메라 세팅 초기화
      </button>
      <button
        onClick={() => {
          console.log(gl);
        }}
      >
        GL Debug
      </button>
    </section>
  );
};

const GeneralSceneInfo = () => {
  const [selecteds, setSelecteds] = useAtom(selectedAtom);
  const threeExports = useAtomValue(threeExportsAtom);
  const lightMaps = useAtomValue(lightMapAtom);
  const { files, loadingFiles } = useFiles();

  if (!threeExports) {
    return null;
  }

  const { scene } = threeExports;
  const totals = groupInfo(scene);

  return (
    <>
      <section style={{ marginTop: 16 }}>
        <strong>파일정보</strong>{' '}
        <span style={{ color: 'gray' }}>{files.length}개</span>
        <ul style={{ paddingLeft: 4 }}>
          {files.map(({ file, name, start, end }, index) => {
            return (
              <li
                key={`파일로드-${index}-${name}`}
                style={{ marginTop: 6, fontSize: 14 }}
              >
                <div>
                  {name}({Math.round(file.size / (1024 * 1024))}mb)
                  {end === 0
                    ? ' : loading...'
                    : ` : ${formatNumber(end - start)}ms`}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section style={{ marginTop: 16 }}>
        <strong>Scene</strong>
        <div style={{ paddingLeft: 4 }}>
          총 노드 : {formatNumber(totals.nodeCount)}개
        </div>
        <div style={{ paddingLeft: 4 }}>
          총 오브젝트3D : {formatNumber(totals.object3dCount)}개
        </div>
        <div style={{ paddingLeft: 4 }}>
          총 메쉬 : {formatNumber(totals.meshCount)}개
        </div>
        <div style={{ paddingLeft: 4 }}>
          총 삼각형 : {formatNumber(totals.triangleCount)}개
        </div>
        <div style={{ paddingLeft: 4 }}>
          총 버텍스 : {formatNumber(totals.vertexCount)}개
        </div>
        <div style={{ paddingLeft: 4 }}>
          총 라이트 맵 수: {Object.keys(lightMaps).length}개
        </div>

        <ul style={{ paddingLeft: 4, marginTop: 8 }}>
          {scene.children.map((child, index) => {
            if (!child.layers.isEnabled(Layer.Model)) {
              return null;
            }

            if (child.type === 'BoxHelper') {
              return null;
            }

            if (isProbeMesh(child)) {
              return null;
            }

            if (isTransformControlOrChild(child)) {
              return null;
            }

            const info = groupInfo(child);
            if (info.nodeCount === 0) {
              console.log(child);
              return null;
            }

            return (
              <li
                key={'info-' + child.uuid}
                style={{
                  cursor: 'pointer',
                  fontSize: 13,
                  border: selecteds.includes(child.uuid)
                    ? '1px solid #888'
                    : undefined,
                }}
                onClick={() => {
                  setSelecteds(prev => {
                    if (prev.length === 1 && prev[0] === child.uuid) {
                      return [];
                    } else {
                      return [child.uuid];
                    }
                  });
                }}
              >
                {/* <div>{child.uuid}</div> */}
                <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                  {child.name}
                </div>
                <div style={{ paddingLeft: 8 }}>
                  노드 : {formatNumber(info.nodeCount)}개
                </div>
                <div style={{ paddingLeft: 8 }}>
                  오브젝트3D : {formatNumber(info.object3dCount)}개
                </div>
                <div style={{ paddingLeft: 8 }}>
                  메쉬 : {formatNumber(info.meshCount)}개
                </div>
                <div style={{ paddingLeft: 8 }}>
                  삼각형 : {formatNumber(info.triangleCount)}개
                </div>
                <div style={{ paddingLeft: 8 }}>
                  버텍스 : {formatNumber(info.vertexCount)}개
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
};

const LightmapImageContrastControl = () => {
  const threeExports = useAtomValue(threeExportsAtom);

  if (!threeExports) {
    return null;
  }

  const { scene } = threeExports;

  const [{ use, value }, setLightMapContrast] = useAtom(lightMapContrastAtom);

  useEffect(() => {
    scene.traverse(o => {
      if (o.type === 'Mesh') {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as VMaterial;
        const shader = mat.shader;
        mat.useLightMapContrast = use;
        if (use) {
          shader.uniforms.lightMapContrast.value = value;
        } else {
          shader.uniforms.lightMapContrast.value = 1;
        }
      }
    });
  }, [use]);

  useEffect(() => {
    if (use) {
      scene.traverse(o => {
        if (o.type === 'Mesh') {
          const mesh = o as THREE.Mesh;
          const mat = mesh.material as VMaterial;
          const shader = mat.shader;
          shader.uniforms.lightMapContrast.value = value;
        }
      });
    }
  }, [value]);

  function updateValue(value: number) {
    setLightMapContrast(pre => ({ ...pre, value: value }));
  }

  return (
    <div>
      <strong>라이트맵 이미지 대비</strong>
      <input
        type="checkbox"
        checked={use}
        onChange={e => {
          if (!threeExports) {
            return;
          }
          setLightMapContrast(pre => ({ ...pre, use: e.target.checked }));
        }}
      />
      {use && (
        <div className="flex items-center gap-x-1">
          <label>Contrast</label>
          <button
            onClick={() => {
              updateValue(1);
            }}
          >
            초기화
          </button>
          <input
            className="w-[100px]"
            type="range"
            min={0}
            max={7}
            step={0.01}
            onChange={e => {
              updateValue(parseFloat(e.target.value));
            }}
            value={value}
          />
          <input
            type="number"
            value={value}
            min={0}
            max={7}
            step={0.01}
            onChange={e => {
              updateValue(parseFloat(e.target.value));
            }}
          />
        </div>
      )}
    </div>
  );
};

const SRGBControl = () => {
  const threeExports = useAtomValue(threeExportsAtom);

  if (!threeExports) {
    return null;
  }

  const { gl } = threeExports;

  const [srgb, setSrgb] = useState<boolean>(
    gl.outputColorSpace === THREE.SRGBColorSpace,
  );

  useEffect(() => {
    gl.outputColorSpace = srgb
      ? THREE.SRGBColorSpace
      : THREE.LinearSRGBColorSpace;
  }, [srgb]);

  return (
    <div>
      <strong>SRGB</strong>
      <input
        type="checkbox"
        checked={srgb}
        onChange={e => {
          if (!threeExports) {
            return;
          }
          setSrgb(e.target.checked);
        }}
      />
    </div>
  );
};

const GeneralPostProcessingControl = () => {
  return (
    <section
      style={{
        marginTop: 16,
        fontSize: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div>
        <button
          onClick={() => {
            // postProcessAtoms가 atom의 맵이라서 value별로 돌면서 getAtomValue를 다 불러줘야함
            const postProcessOptions: Record<string, any> = {};
            const postProcessAtoms = Object.entries(
              getAtomValue(postprocessAtoms),
            );
            postProcessAtoms.forEach(
              ([label, value]: [string, WritableAtom<any, any, any>]) => {
                postProcessOptions[label] = getAtomValue(value);
              },
            );

            uploadJson('postprocess.json', postProcessOptions);
          }}
        >
          업로드
        </button>
        <button
          onClick={() => {
            loadPostProcessAndSet();
          }}
        >
          불러오기
        </button>
      </div>
      <HueSaturationOption></HueSaturationOption>
      <ColorTemperatureOption></ColorTemperatureOption>
      <BrightnessContrastOption></BrightnessContrastOption>
      <LightmapImageContrastControl></LightmapImageContrastControl>
      <SRGBControl></SRGBControl>
      <BloomOption></BloomOption>
      <ColorLUTOption></ColorLUTOption>
      <ToneMappingOption></ToneMappingOption>
      <FXAAOption></FXAAOption>
      <SMAAOption></SMAAOption>
    </section>
  );
};

const GeneralEnvironmentControl = () => {
  const [env, setEnv] = useEnvParams();
  const [envUrl, setEnvUrl] = useEnvUrl();
  const { filelist, loading } = useFilelist();

  return (
    <section style={{ width: '100%' }}>
      <strong>환경맵</strong>
      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column' }}>
        <div>
          <select
            value={env.select}
            onChange={e => {
              setEnv(prev => ({
                select: e.target.value as 'none' | 'preset' | 'custom' | 'url',
                rotation: prev.rotation,
              }));
            }}
          >
            <option value="none">없음</option>
            <option value="preset">프리셋</option>
            <option value="custom">업로드한 환경맵</option>
            <option value="url">URL</option>
          </select>
        </div>
      </div>
      {env.select === 'preset' && (
        <>
          <div
            style={{
              display: env.select === 'preset' ? 'flex' : 'none',
              flexDirection: 'column',
              marginTop: 4,
            }}
          >
            <select
              style={{ width: '50%' }}
              value={env.preset}
              onChange={e => {
                setEnv({
                  ...env,
                  preset: e.target.value as
                    | 'apartment'
                    | 'city'
                    | 'dawn'
                    | 'forest'
                    | 'lobby'
                    | 'night'
                    | 'park'
                    | 'studio'
                    | 'sunset'
                    | 'warehouse',
                });
              }}
            >
              <option value="apartment">아파트</option>
              <option value="city">도시</option>
              <option value="dawn">새벽</option>
              <option value="forest">숲</option>
              <option value="lobby">로비</option>
              <option value="night">밤</option>
              <option value="park">공원</option>
              <option value="studio">스튜디오</option>
              <option value="sunset">일몰</option>
              <option value="warehouse">창고</option>
            </select>
            <div style={{ width: '100%' }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={env.intensity ?? 1}
                onChange={e => {
                  setEnv({
                    ...env,
                    intensity: parseFloat(e.target.value),
                  });
                }}
              ></input>
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                Intensity : {toNthDigit(env.intensity ?? 1, 2)}
              </span>
            </div>
          </div>
        </>
      )}
      {env.select === 'custom' && (
        <>
          <div
            style={{
              display: env.select === 'custom' ? 'flex' : 'none',
              flexDirection: 'column',
              marginTop: 4,
            }}
          >
            <select
              value={env.url ?? __UNDEFINED__}
              onChange={e => {
                setEnv(prev => ({
                  select: 'custom',
                  url: e.target.value,
                  rotation: prev.rotation,
                }));
              }}
            >
              <option value={__UNDEFINED__}>선택</option>
              {filelist.envs.map(fileinfo => {
                return (
                  <option
                    key={`customenvmap-${fileinfo.fileUrl}`}
                    value={fileinfo.fileUrl}
                  >
                    {fileinfo.filename}
                  </option>
                );
              })}
            </select>
            <div style={{ width: '100%' }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={env.intensity ?? 1}
                onChange={e => {
                  setEnv({
                    ...env,
                    intensity: parseFloat(e.target.value),
                  });
                }}
              ></input>
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                Intensity : {toNthDigit(env.intensity ?? 1, 2)}
              </span>
            </div>
          </div>
        </>
      )}
      {env.select === 'url' && (
        <>
          <div
            style={{
              width: '100%',
            }}
          >
            Url :
            <input
              type="text"
              value={envUrl ?? ''}
              onChange={e => {
                setEnvUrl(e.target.value?.trim());
              }}
            ></input>
            <button
              onClick={() => {
                if (envUrl) {
                  setEnv(prev => ({
                    select: 'custom',
                    url: envUrl,
                    rotation: prev.rotation,
                  }));
                  set('envUrl', envUrl);
                } else {
                  alert('URL을 입력해주세요.');
                }
              }}
              disabled={Boolean(envUrl) && env.url === envUrl}
            >
              {Boolean(envUrl) && env.url === envUrl ? '적용됨' : '적용하기'}
            </button>
            <div style={{ width: '100%' }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={env.intensity ?? 1}
                onChange={e => {
                  setEnv({
                    ...env,
                    intensity: parseFloat(e.target.value),
                  });
                }}
              ></input>
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                Intensity : {toNthDigit(env.intensity ?? 1, 2)}
              </span>
            </div>
          </div>
        </>
      )}
      {env.select !== 'none' && (
        <div style={{ width: '100%', marginLeft: 8, fontSize: 11 }}>
          <button
            style={{ fontSize: 11 }}
            onClick={() => {
              setEnv(prev => ({ ...prev, rotation: { x: 0, y: 0, z: 0 } }));
            }}
          >
            회전리셋
          </button>
          <div>
            X :{' '}
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step={0.01}
              value={env.rotation?.x ?? 0}
              onChange={e => {
                setEnv(prev => ({
                  ...prev,
                  rotation: {
                    x: parseFloat(e.target.value),
                    y: prev.rotation?.y ?? 0,
                    z: prev.rotation?.z ?? 0,
                  },
                }));
              }}
            ></input>
            {toNthDigit(((env.rotation?.x ?? 0) / Math.PI) * 90, 2)}
          </div>
          <div>
            Y :{' '}
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step={0.01}
              value={env.rotation?.y ?? 0}
              onChange={e => {
                setEnv(prev => ({
                  ...prev,
                  rotation: {
                    x: prev.rotation?.x ?? 0,
                    y: parseFloat(e.target.value),
                    z: prev.rotation?.z ?? 0,
                  },
                }));
              }}
            ></input>
            {toNthDigit(((env.rotation?.y ?? 0) / Math.PI) * 90, 2)}
          </div>
          z
          <div>
            Z :{' '}
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step={0.01}
              value={env.rotation?.z ?? 0}
              onChange={e => {
                setEnv(prev => ({
                  ...prev,
                  rotation: {
                    x: prev.rotation?.x ?? 0,
                    y: prev.rotation?.y ?? 0,
                    z: parseFloat(e.target.value),
                  },
                }));
              }}
            ></input>
            {toNthDigit(((env.rotation?.z ?? 0) / Math.PI) * 90, 2)}
          </div>
        </div>
      )}
    </section>
  );
};

const GeneralMaterialControl = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  if (!threeExports) {
    return null;
  }
  const { scene } = threeExports;

  const [aoValue, setAoValue] = useState(0);
  const [lmIntensityValue, setlmIntensityValue] = useState(1);
  const [wireframe, setWireframe] = useState(false);
  const [materialSetting, setMaterialSetting] = useAtom(materialSettingAtom);
  const [progress, setProgress] = useState<number>(0);
  const [isProgress, setIsProgress] = useState<boolean>(true);

  useEffect(() => {
    scene.traverse(o => {
      if (o.type === 'Mesh') {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as VMaterial;
        const box = new THREE.Box3().setFromObject(mesh);

        // dissolveOrigin 설정: x는 minX, y는 중앙, z는 minZ
        const minX = box.min.x; // 왼쪽 X 좌표
        const centerY = (box.min.y + box.max.y) / 2; // Y 중앙
        const minZ = box.min.z; // 가장 앞쪽 (액자의 왼쪽 테두리)

        // dissolveOrigin을 Three.js Vector3로 설정
        const dissolveOrigin = new THREE.Vector3(minX, centerY, minZ);

        // 3D 거리 사용
        mat.setUniformByValue('dissolveMaxDist', box.max.distanceTo(box.min));

        // Shader Uniform에 dissolveOrigin 전달
        mat.setUniformByValue('dissolveOrigin', dissolveOrigin);
        mat.setUniformByValue('dissolveDirection', false);
        mat.setUniformByValue('progress', progress);
        mat.needsUpdate = true;

        mat.useProgressiveAlpha = isProgress;
      }
    });
  }, [isProgress]);

  useEffect(() => {
    if (isProgress) {
      scene.traverse(o => {
        if (o.type === 'Mesh') {
          const mesh = o as THREE.Mesh;
          const mat = mesh.material as VMaterial;
          mat.setUniformByValue('progress', progress);
        }
      });
    }
  }, [progress]);

  return (
    <section className="w-full">
      <strong>재질 일괄 설정</strong>
      <div className="flex">
        <div className="mr-3">AO</div>
        <input
          className="flex-1 min-w-0"
          type="range"
          value={aoValue}
          onChange={e => {
            const allMeshes: THREE.Mesh[] = [];
            scene.traverse(child => {
              if (child instanceof THREE.Mesh) {
                allMeshes.push(child);
              }
            });
            allMeshes.forEach(mesh => {
              //@ts-ignore
              mesh.material.aoMapIntensity = parseFloat(e.target.value);
            });
            setAoValue(parseFloat(e.target.value));
          }}
          min={0}
          max={1}
          step={0.01}
        ></input>
        <input
          type="number"
          value={aoValue}
          onChange={e => {
            const allMeshes: THREE.Mesh[] = [];
            scene.traverse(child => {
              if (child instanceof THREE.Mesh) {
                allMeshes.push(child);
              }
            });
            allMeshes.forEach(mesh => {
              //@ts-ignore
              mesh.material.aoMapIntensity = parseFloat(e.target.value);
            });
            setAoValue(parseFloat(e.target.value));
          }}
          min={0}
          max={AOMAP_INTENSITY_MAX}
          step={0.01}
        ></input>
      </div>
      <div className="flex">
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
              (mesh.material as THREE.MeshStandardMaterial).lightMapIntensity =
                parseFloat(e.target.value);
            });
            setlmIntensityValue(parseFloat(e.target.value));
          }}
          min={0}
          max={LIGHTMAP_INTENSITY_MAX}
          step={0.1}
        ></input>
        <input
          type="number"
          value={lmIntensityValue}
          onChange={e => {
            const allMeshes: THREE.Mesh[] = [];
            scene.traverse(child => {
              if (child instanceof THREE.Mesh) {
                allMeshes.push(child);
              }
            });
            allMeshes.forEach(mesh => {
              (mesh.material as THREE.MeshStandardMaterial).lightMapIntensity =
                parseFloat(e.target.value);
            });
            setlmIntensityValue(parseFloat(e.target.value));
          }}
          min={0}
          max={LIGHTMAP_INTENSITY_MAX}
          step={0.1}
        ></input>
      </div>
      <div className="flex">
        <div className="mr-3">Wireframe</div>
        <input
          type="checkbox"
          checked={wireframe}
          onChange={event => {
            const checked = event.target.checked;
            const allMeshes: THREE.Mesh[] = [];
            scene.traverse(child => {
              if (child instanceof THREE.Mesh) {
                allMeshes.push(child);
              }
            });
            allMeshes.forEach(mesh => {
              //@ts-ignore
              mesh.material.wireframe = checked;
            });
            setWireframe(pre => !pre);
          }}
        />
      </div>
      <div className="flex">
        <div className="mr-3">setProgress</div>
        <input
          type="checkbox"
          checked={isProgress}
          onChange={event => {
            const checked = event.target.checked;
            setIsProgress(checked);
          }}
        />
      </div>
      {isProgress && (
        <div className="flex">
          <div className="mr-3">progress Test</div>
          <input
            className="flex-1 min-w-0"
            type="range"
            value={progress}
            onChange={e => {
              setProgress(parseFloat(e.target.value));
            }}
            min={0}
            max={1}
            step={0.01}
          ></input>
          <input
            type="number"
            value={progress}
            onChange={e => {
              setProgress(parseFloat(e.target.value));
            }}
            min={0}
            max={1}
            step={0.01}
          ></input>
        </div>
      )}
    </section>
  );
};

const hoveredStat = (hovered: HTMLLIElement) => {
  return JSON.parse(hovered.getAttribute('data-stat')!) as {
    stat: StatPerSecond;
    dst: 'framerate' | 'memory';
  };
};

const relativePosition = (element?: HTMLLIElement | null) => {
  if (!element) {
    return null;
  }
  // px relative to its parent
  const rect = element.getBoundingClientRect();
  const parentRect = element.parentElement?.getBoundingClientRect();

  if (!parentRect) {
    return null;
  }

  const isMemory = hoveredStat(element).dst === 'memory';

  const offsetLeft = isMemory ? parentRect.width : 0;

  return {
    top: rect.top - parentRect.top,
    left: rect.left - parentRect.left + offsetLeft,
  };
};

const STAT_INTERVAL = 500; //ms

const byteToMB = (byte: number) => {
  return Math.round(byte / (1024 * 1024));
};

const GeneralStats = () => {
  const [on, setOn] = useState(false);
  const [stats, setStats] = useState<VStats>();
  const getStats = useStats(on, STAT_INTERVAL);
  const [hovered, setHovered] = useState<HTMLLIElement>();

  useEffect(() => {
    const interval = setInterval(() => {
      const stats = getStats();
      setStats(stats);
      // console.log(
      //   stats.stats[stats.stats.length - 1].highestMemoryUsage,
      //   stats.baseMemory!.totalJSHeapSize,
      // );
    }, STAT_INTERVAL);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const highest = useMemo(
    () => stats?.highestMemoryUsage ?? 0,
    [stats?.highestMemoryUsage],
  );

  if (!on) {
    return (
      <section>
        <strong>통계</strong>
        <input
          type="checkbox"
          checked={on}
          onChange={e => setOn(e.target.checked)}
        ></input>
      </section>
    );
  }

  if (!stats) {
    return (
      <section>
        <strong>통계</strong>
        <input
          type="checkbox"
          checked={on}
          onChange={e => setOn(e.target.checked)}
        ></input>
        <div>
          <div>로딩중...</div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div>
        <strong>통계</strong>
        <input
          type="checkbox"
          checked={on}
          onChange={e => setOn(e.target.checked)}
        ></input>{' '}
        - <span>{Math.round(stats.elapsed / 1000)}초</span>
      </div>
      <div>
        <div>
          <div>
            최대메모리사용량 :{' '}
            <span>
              {formatNumber(byteToMB(highest))} /{' '}
              {formatNumber(byteToMB(stats.baseMemory?.jsHeapSizeLimit ?? 0))}mb
              (
              {Math.round(
                (100 * highest) / (stats.baseMemory?.jsHeapSizeLimit ?? 0),
              )}
              %)
            </span>
          </div>
          <div>평균 프레임 : {Math.round(stats.averageFramerate)}</div>
          <div>
            마지막 10초 프레임 :{' '}
            {stats.stats
              .slice(-10)
              .reduce((acc, cur) => acc + cur.framerate, 0) / 10}
          </div>
          <div>Lowest 1% : {stats.lowest1percentFramerate}fps</div>
          <div className="w-full grid grid-cols-2 relative">
            <ul
              id="ul1"
              className="relative w-full h-20 bg-slate-100 overflow-hidden"
            >
              {stats.stats.map(stat => {
                return (
                  <li
                    data-stat={JSON.stringify({ stat, dst: 'framerate' })}
                    onMouseEnter={e => {
                      setHovered(e.currentTarget);
                    }}
                    key={`stat-frame-${stat.at}`}
                    style={{
                      position: 'absolute',
                      height: '100%',
                      width: 2,
                      bottom: 0,
                      right: 0,
                      transform: `translateX(-${(stats.end - stat.at) / 500}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.min(stat.framerate, 100)}%`,
                        backgroundColor: 'red',
                        position: 'absolute',
                        bottom: 0,
                      }}
                    ></div>
                  </li>
                );
              })}
            </ul>
            <ul
              id="ul2"
              className="relative w-full h-20 bg-slate-100 overflow-hidden"
            >
              {stats.stats.map(stat => {
                return (
                  <li
                    onMouseEnter={e => {
                      setHovered(e.currentTarget);
                    }}
                    data-stat={JSON.stringify({ stat, dst: 'memory' })}
                    key={`stat-memory-${stat.at}`}
                    style={{
                      position: 'absolute',
                      height: '100%',
                      // height: `${stat.framerate / (stats.maxFrameRate + 0.001)}%`,
                      width: 2,
                      bottom: 0,
                      right: 0,
                      transform: `translateX(-${(stats.end - stat.at) / 500}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.min((100 * stat.highestMemoryUsage) / (window as any).performance.memory.jsHeapSizeLimit, 100)}%`,
                        position: 'absolute',
                        backgroundColor: 'blue',
                        bottom: 0,
                      }}
                    ></div>
                  </li>
                );
              })}
            </ul>
            {hovered && relativePosition(hovered) && (
              <div
                className="absolute top-0 left-0 bg-slate-400"
                style={{
                  transform: `translate(calc(${relativePosition(hovered)!.left}px - 50%), -10px)`,
                }}
              >
                {hoveredStat(hovered).dst === 'memory'
                  ? `${byteToMB(hoveredStat(hovered).stat.highestMemoryUsage)}mb`
                  : `${hoveredStat(hovered).stat.framerate}fps`}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const SceneInfo = () => {
  // const [env, setEnv] = useAtom(envAtom);
  const threeExports = useAtomValue(threeExportsAtom);

  if (!threeExports) {
    return null;
  }

  const { scene } = threeExports;
  // const totals = groupInfo(scene);

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
      <GeneralStats></GeneralStats>
      <GeneralButtons></GeneralButtons>
      <GeneralMaterialControl></GeneralMaterialControl>
      <GeneralEnvironmentControl></GeneralEnvironmentControl>
      <GeneralPostProcessingControl></GeneralPostProcessingControl>
      <GeneralSceneInfo></GeneralSceneInfo>

      <CameraInfoSection></CameraInfoSection>
    </div>
  );
};

export default SceneInfo;
