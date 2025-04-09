import { useAtom, useAtomValue, WritableAtom } from 'jotai';
import useFiles from '../scripts/useFiles';
import {
  compressObjectToFile,
  formatNumber,
  getEXRLightMapsFromScene,
  groupInfo,
  isProbeMesh,
  isTransformControlOrChild,
  loadLatest,
  toNthDigit,
  uploadExrLightmap,
} from '../scripts/utils';

import gsap from 'gsap';
import { get, set } from 'idb-keyval';
import objectHash from 'object-hash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ColorPicker, useColor } from 'react-color-palette';
import { useNavigate } from 'react-router-dom';
import VTextureLoader from 'src/scripts/loaders/VTextureLoader.ts';
import ReflectionProbe from 'src/scripts/ReflectionProbe.ts';
import { Quaternion, THREE, Vector3 } from 'VTHREE';
import {
  __UNDEFINED__,
  AOMAP_INTENSITY_MAX,
  Layer,
  LIGHTMAP_INTENSITY_MAX,
} from '../Constants';
import { defaultSettings, loadSettings } from '../pages/useSettings.ts';
import {
  anisotropyAtom,
  cameraMatrixAtom,
  DPAtom,
  DPCModeAtom,
  getAtomValue,
  lightMapAtom,
  lightMapContrastAtom,
  materialSettingAtom,
  minimapAtom,
  postprocessAtoms,
  ProbeAtom,
  selectedAtom,
  testAtom,
  threeExportsAtom,
  uploadingAtom,
  useBenchmark,
  useEnvParams,
  useToast,
} from '../scripts/atoms';
import {
  loadPostProcessAndSet,
  prepareWalls,
  recompileAsync,
  uploadJson,
} from '../scripts/atomUtils.ts';
import useFilelist from '../scripts/useFilelist';
import { parseDroppedFiles } from '../scripts/useModelDragAndDrop.ts';
import useStats, { StatPerSecond, VStats } from '../scripts/useStats.ts';
import VGLTFExporter from '../scripts/VGLTFExporter.ts';
import { BloomOption } from './canvas/Bloom.tsx';
import { BrightnessContrastOption } from './canvas/BrightnessContrast.tsx';
import { ColorLUTOption } from './canvas/ColorLUT.tsx';
import { ColorTemperatureOption } from './canvas/ColorTemperature.tsx';
import { FXAAOption } from './canvas/FXAA.tsx';
import { HueSaturationOption } from './canvas/HueSaturation.tsx';
import { SMAAOption } from './canvas/SMAA.tsx';
import { ToneMappingOption } from './canvas/ToneMapping.tsx';
import UploadPage from './UploadModal';
import JSZip from 'jszip';

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
  const { openToast, closeToast } = useToast();
  const navigate = useNavigate();
  const { addBenchmark } = useBenchmark();
  const [isUploading, setUploading] = useAtom(uploadingAtom);

  const handleResetSettings = async () => {
    await defaultSettings();
    await loadSettings(); // Reload settings from IDB to update atoms
  };

  if (!threeExports) {
    return null;
  }

  const { scene } = threeExports;

  async function uploadLightMaps(isSceneUpload: boolean, isMobile?: boolean) {
    if (!isSceneUpload) {
      if (!confirm('라이트맵 업로드 하시겠습니까?')) {
        return;
      }
    }
    openToast('라이트맵 업로드 중...', { autoClose: false });
    setUploading(true);
    await uploadExrLightmap(threeExports!.scene, isMobile);
    setUploading(false);
    closeToast();
  }

  async function downloadSet() {
    if (confirm('테스트 용입니다. 세트 다운로드 하시겠나여?')) {
      openToast('라이트맵 준비 중..', { autoClose: false });
      const lightMapFiles = await getEXRLightMapsFromScene(scene);
      // before
      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mesh = o as THREE.Mesh;
          const mat = mesh.matStandard;
          if (
            mat.vUserData.lightMap &&
            mat.vUserData.lightMap.endsWith('.exr')
          ) {
            mat.vUserData.lightMap =
              'mobile/' + mat.vUserData.lightMap.replace('.exr', '.ktx');
          }
        }
      });
      openToast('GLB 준비 중..', { autoClose: false, override: true });
      const glbArr = await new VGLTFExporter().parseAsync(scene, {
        binary: true,
      });
      if (glbArr instanceof ArrayBuffer) {
        const blob = new Blob([glbArr], {
          type: 'application/octet-stream',
        });
        const glbFile = new File([blob], 'latest.glb', {
          type: 'model/gltf-binary',
        });

        const zip = new JSZip();
        zip.file('model.glb', glbFile);

        const lightMapFolder = zip.folder('lightMaps');
        if (lightMapFolder) {
          for (const file of lightMapFiles) {
            const data = await file.arrayBuffer();
            lightMapFolder.file(file.name, data);
          }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        closeToast();
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scene.zip';
        a.click();
        URL.revokeObjectURL(url); // 메모리 해제

        scene.traverseAll(o => {
          if (o.type === 'Mesh') {
            const mesh = o as THREE.Mesh;
            const mat = mesh.matStandard;
            if (
              mat.vUserData.lightMap &&
              mat.vUserData.lightMap.endsWith('.ktx') &&
              mat.vUserData.isExr
            ) {
              mat.vUserData.lightMap = mat.vUserData.lightMap.replace(
                '.ktx',
                '.exr',
              );
            }
          }
        });
      }
    }
  }

  async function uploadModels(lightMapUploaded?: boolean = false) {
    if (!confirm('GLB 업로드 하시겠습니까?')) {
      return;
    }
    const uploadUrl = import.meta.env.VITE_UPLOAD_URL;
    if (!uploadUrl) {
      alert('.env에 환경변수를 설정해주세요, uploadUrl');
      return;
    }
    openToast('GLB 업로드 중...', { autoClose: false, override: true });
    setUploading(true);
    const scene = threeExports!.scene;
    console.log(lightMapUploaded);
    if (!lightMapUploaded) {
      scene.traverse(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).material as THREE.Material;
          const lm = mat.vUserData.lightMap;
          if (lm && lm.endsWith('.exr')) {
            mat.vUserData.lightMap = lm.replace('.exr', '.ktx');
          }
        }
      });
    }
    new VGLTFExporter()
      .parseAsync(threeExports!.scene, { binary: true })
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
          const hashFile = compressObjectToFile(hashData, 'latest-hash');
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
            closeToast();
            setUploading(false);
          });
        } else {
          console.error(
            'VGLTFExporter GLB 처리 안됨, "binary: true" option 확인',
          );
          alert('VGLTFExporter 문제 발생함, 로그 확인');
          closeToast();
          setUploading(false);
        }
      });
  }

  async function uploadMobileModels() {
    if (!confirm('모바일 씬을 업로드 하시겠습니까?')) {
      return;
    }

    const uploadUrl = import.meta.env.VITE_UPLOAD_URL;
    if (!uploadUrl) {
      alert('.env에 환경변수를 설정해주세요, uploadUrl');
      return;
    }
    openToast('GLB 업로드 중...', { autoClose: false, override: true });
    setUploading(true);
    new VGLTFExporter()
      .parseAsync(threeExports!.scene, { binary: true })
      .then(glbArr => {
        if (glbArr instanceof ArrayBuffer) {
          console.log('before File Make');
          const blob = new Blob([glbArr], {
            type: 'application/octet-stream',
          });
          const file = new File([blob], 'latest_mobile.glb', {
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
          const hashFile = compressObjectToFile(hashData, 'latest-hash');
          const hashFd = new FormData();
          hashFd.append('files', hashFile);
          console.log('before Upload');
          Promise.all([
            fetch(uploadUrl, {
              method: 'POST',
              body: hashFd,
            }),
            fetch(`${uploadUrl}?path=mobile`, {
              method: 'POST',
              body: fd,
            }),
          ]).then(() => {
            alert('업로드 완료');
            closeToast();
            setUploading(false);
          });
        } else {
          console.error(
            'VGLTFExporter GLB 처리 안됨, "binary: true" option 확인',
          );
          alert('VGLTFExporter 문제 발생함, 로그 확인');
          closeToast();
          setUploading(false);
        }
      });
  }

  async function uploadScene() {
    if (confirm('씬을 업로드 하시겠습니까?')) {
      await uploadLightMaps(true);
      await uploadModels(true);
      alert('씬 업로드 완료');
    }
  }

  async function mobileUpload() {
    if (confirm('모바일 씬을 업로드 하시겠습니까?')) {
      await uploadLightMaps(true, true);
      await uploadMobileModels();
    }
  }

  return (
    <section className="w-full grid gap-2 grid-cols-3">
      <button disabled={isUploading} onClick={uploadScene}>
        씬 업로드
      </button>
      <button disabled={isUploading} onClick={mobileUpload}>
        모바일용 업로드
      </button>
      <button disabled={isUploading} onClick={() => uploadModels()}>
        GLB 만 업로드
      </button>
      <button disabled={isUploading} onClick={() => uploadLightMaps(false)}>
        라이트맵만 업로드
      </button>
      <button
        onClick={() => {
          navigate('/mobile');
        }}
      >
        모바일
      </button>
      <button
        onClick={() => {
          openToast('업로드한 씬 불러오는 중..', { autoClose: false });
          loadLatest({
            threeExports,
            addBenchmark,
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
          openToast('모바일 씬 불러오는 중..', { autoClose: false });
          loadLatest({
            threeExports,
            mobile: true,
            addBenchmark,
            closeToast,
          }).catch(e => {
            console.error(e);
            alert('최신 업로드 불러오기 실패');
            closeToast();
          });
        }}
      >
        모바일 불러오기
      </button>
      <button onClick={handleResetSettings}>카메라 세팅 초기화</button>
      <button onClick={recompileAsync}>리컴파일</button>
      <button
        onClick={() => {
          const ktxs = threeExports
            .scene!.meshes()
            .find(mesh => mesh.name === '침실2_DP3002_4')!
            .matStandard!.textures()
            .map((t, i) =>
              t.vUserData.ktx2Buffer
                ? {
                    name: i,
                    buffer: t.vUserData.ktx2Buffer,
                  }
                : undefined,
            )
            .filter(Boolean);
          ktxs.forEach(({ name, buffer }) => {
            // download as ktx file
            name = name + '.ktx';
            const blob = new Blob([buffer], {
              type: 'application/octet-stream',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);

            document.body.removeChild(a);
          });
        }}
      >
        ktx다운로드
      </button>
      <button onClick={downloadSet}>세트 다운로드</button>
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

const useLightmapTransitionDrag = () => {
  const [isDragging, setIsDragging] = useState(false);
  const threeExports = useAtomValue(threeExportsAtom);
  const [files, setFiles] = useState<File[]>([]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      const extensions = [
        '.gltf',
        '.glb',
        '.png',
        '.jpg',
        '.exr',
        '.ktx',
        '.json',
      ];
      parseDroppedFiles(event, extensions)
        .then(async filteredFiles => {
          if (filteredFiles.length === 0) {
            alert(`다음 파일들만 가능 : ${extensions.join(', ')}`);
            return;
          }

          setFiles(filteredFiles);
        })
        .finally(() => {
          event.dataTransfer.clearData();
        });
    }
  };

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    files,
  };
};

const LightmapTransitionControl = () => {
  const { scene } = useAtomValue(threeExportsAtom)!;
  const [progress, setProgress] = useState(0);
  const { handleDragOver, handleDragLeave, handleDrop, isDragging, files } =
    useLightmapTransitionDrag();
  const threeExports = useAtomValue(threeExportsAtom);

  useEffect(() => {
    scene.traverse(o => {
      const mat = (o as THREE.Mesh).matStandard;
      if (mat) {
        mat.progress = progress;
      }
    });
  }, [progress]);

  const noFile = files.length === 0;

  return (
    <section
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{
        border: isDragging ? '1px dashed #888' : undefined,
        padding: 8,
        marginTop: 16,
      }}
    >
      <strong>라이트맵 트랜지션</strong>{' '}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={progress}
        onChange={e => {
          setProgress(parseFloat(e.target.value));
        }}
      />
      <button
        disabled={noFile}
        onClick={() => {
          if (noFile) {
            return;
          }

          scene.traverse(o => {
            const mat = o.asMesh?.mat;
            if (mat && mat.name === 'MI_TCE036S.003') {
              VTextureLoader.loadAsync(files[0], {
                gl: threeExports?.gl,
                as: 'texture',
              }).then(t => {
                mat.uniform.uLightMapTo.value = t;
                mat.apply('lightmapTransition', {
                  target: t,
                  progress,
                });
              });
            }
          });
        }}
      >
        {noFile ? '라이트맵 드래그&드랍' : '적용'}
      </button>
      {noFile ? (
        <div>파일없음</div>
      ) : (
        <ul>
          {files.map((file, index) => {
            return (
              <li key={`lmfile-${file.name}-${index}`}>
                {file.name} : {Math.round(file.size / (1024 * 1024))}mb
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

const ProbeControl = () => {
  const { scene, gl, camera } = useAtomValue(threeExportsAtom)!;
  const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);

  function addProbe() {
    const probe = new ReflectionProbe(gl, scene, camera);
    probe.addToScene();
    setProbes(prev => [...prev, probe]);
  }

  // useEffect(() => {
  //   scene.traverse(o => {
  //     if (o.asMesh?.mat?.vUserData?.isVMaterial) {
  //       const mat = o.asMesh.mat!;
  //       mat.prepareProbe({
  //         probes,
  //       });
  //     }
  //   });
  // }, [probes]);

  return (
    <section>
      <strong>프로브</strong>
      <button onClick={addProbe}>프로브 추가</button>
      <button
        onClick={() => {
          const walls: {
            start: THREE.Vector3;
            end: THREE.Vector3;
            probeId: string;
          }[] = prepareWalls();

          scene.traverse(o => {
            if (o.asMesh?.mat?.vUserData?.isVMaterial) {
              const mat = o.asMesh.mat!;

              if (mat.name === 'MI_TCE036S.003') {
                mat.prepareProbe({
                  probeCount: probes.length,
                  wallCount: walls.length,
                });
              } else {
                mat.prepareProbe({
                  probeCount: probes.length,
                });
              }

              mat.needsUpdate = true;
            }
          });

          console.log('prepareProbe finished');
        }}
      >
        프로브 준비 (셰이더컴파일)
      </button>
      <button
        onClick={() => {
          const walls: {
            start: THREE.Vector3;
            end: THREE.Vector3;
            probeId: string;
          }[] = prepareWalls();

          scene.traverse(o => {
            if (o.asMesh?.mat?.vUserData?.isVMaterial) {
              const mat = o.asMesh.mat!;
              if (mat.name === 'MI_TCE036S.003') {
                mat.apply('probe', {
                  probes,
                  walls,
                });
              } else {
                mat.apply('probe', {
                  probes,
                });
              }

              mat.needsUpdate = true;
            }
          });
        }}
      >
        프로브 적용
      </button>
      <ul>
        {probes.map(p => {
          return (
            <li key={`probe-shader-${p.getId()}`}>
              {p.getName()}{' '}
              <button
                onClick={() => {
                  p.updateCameraPosition(p.getBoxMesh().position, true);
                }}
              >
                찍기
              </button>
              <button
                onClick={() => {
                  p.setShowProbe(false);
                }}
              >
                숨기기
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const ProgressiveAlphaControl = () => {
  const { scene } = useAtomValue(threeExportsAtom)!;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    scene.traverse(o => {
      const mat = (o as THREE.Mesh).material as THREE.Material;
      if (!mat) {
        return;
      }
      mat.uniform!.uProgress.value = progress;
    });
  }, [progress]);

  return (
    <section>
      <strong>Fade In/Out 애니메이션</strong>{' '}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={progress}
        onChange={e => {
          setProgress(parseFloat(e.target.value));
        }}
      />
      <button
        onClick={() => {
          scene.traverse(o => {
            o.asMesh?.mat?.apply?.('meshTransition', {
              direction: 'fadeOut',
              progress,
            });
          });
        }}
      >
        없어지는
      </button>
      <button
        onClick={() => {
          scene.traverse(o => {
            o.asMesh?.mat?.apply?.('meshTransition', {
              direction: 'fadeIn',
              progress,
            });
          });
        }}
      >
        생기는
      </button>
      <button
        onClick={() => {
          scene.traverse(o => {
            o.asMesh?.mat?.apply?.('meshTransition', {
              direction: 'fadeOut',
            });
          });

          gsap.to(
            { progress: 0 },
            {
              duration: 1,
              progress: 1,
              onUpdate() {
                const progressValue = this.targets()[0].progress;
                setProgress(progressValue);

                scene.traverse(o => {
                  const mat = o.asMesh?.mat;
                  if (mat) {
                    mat.progress = progressValue;
                  }
                });
              },
            },
          );
        }}
      >
        gsap없어지는
      </button>
      <button
        onClick={() => {
          scene.traverse(o => {
            o.asMesh?.mat?.apply?.('meshTransition', {
              direction: 'fadeIn',
            });
          });

          gsap.to(
            { progress: 0 },
            {
              duration: 1,
              progress: 1,
              onUpdate() {
                const progressValue = this.targets()[0].progress;
                setProgress(progressValue);

                scene.traverse(o => {
                  const mat = o.asMesh?.mat;
                  if (mat) {
                    mat.progress = progressValue;
                  }
                });
              },
            },
          );
        }}
      >
        gsap생기는
      </button>
      <button
        onClick={() => {
          scene.traverse(o => {
            const mat = (o as THREE.Mesh).material as THREE.Material;
            if (!mat) {
              return;
            }

            mat.remove('meshTransition');
          });
        }}
      >
        삭제
      </button>
    </section>
  );
};

const LightmapImageContrastControl = () => {
  const threeExports = useAtomValue(threeExportsAtom)!;

  const { scene } = threeExports;

  const [{ use, value }, setLightMapContrast] = useAtom(lightMapContrastAtom);

  useEffect(() => {
    scene.traverse(o => {
      if (o.type === 'Mesh') {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as THREE.Material;

        if (use) {
          mat.uniform.uLightMapContrast.value = value;
        } else {
          mat.uniform.uLightMapContrast.value = 1;
        }
        mat.needsUpdate = true;
      }
    });
  }, [use, value]);

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
      {/* <ProgressiveAlphaControl></ProgressiveAlphaControl> */}
      {/* <ProbeControl></ProbeControl> */}
      {/* <LightmapTransitionControl></LightmapTransitionControl> */}
      <SRGBControl></SRGBControl>
      <BloomOption></BloomOption>
      <ColorLUTOption></ColorLUTOption>
      <ToneMappingOption></ToneMappingOption>
      <FXAAOption></FXAAOption>
      <SMAAOption></SMAAOption>
    </section>
  );
};

const GeneralMinimapControl = () => {
  const [{ show, urls, useIndex }, setMinimap] = useAtom(minimapAtom);

  return (
    <section style={{ width: '100%' }}>
      <strong>미니맵</strong>
      <div className="flex gap-x-1">
        <span>보기</span>
        <input
          type="checkbox"
          checked={show}
          onChange={e => {
            setMinimap(pre => ({ ...pre, show: !pre.show }));
          }}
        />
      </div>
      <div className="flex gap-x-1 mt-1">
        {urls.map((url, index) => (
          <button
            key={'minimapHandleButton-' + index}
            onClick={() => {
              setMinimap(pre => ({ ...pre, useIndex: index }));
            }}
            disabled={useIndex === index}
          >
            {index} 번 미니맵
          </button>
        ))}
      </div>
    </section>
  );
};

const TestControl = () => {
  const [test, setTest] = useAtom(testAtom);

  return (
    <section className="w-full flex flex-col gap-y-2">
      <div>
        <strong>스카이박스</strong>
        <div className="flex gap-x-1">
          <span>보기</span>
          <input
            type="checkbox"
            checked={test.useSkyBox}
            onChange={e => {
              setTest(pre => ({ ...pre, useSkyBox: !pre.useSkyBox }));
            }}
          />
        </div>
      </div>
      <div>
        <strong>Select Box</strong>
        <div className="flex gap-x-1">
          <span>보기</span>
          <input
            type="checkbox"
            checked={test.showSelectBox}
            onChange={e => {
              setTest(pre => ({ ...pre, showSelectBox: !pre.showSelectBox }));
            }}
          />
        </div>
      </div>
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

const AnisotropyControl = () => {
  const [anisotropyValue, setAnisotropyValue] = useAtom(anisotropyAtom);
  return (
    <div>
      <span>anisotropy</span>
      <input
        type="range"
        value={anisotropyValue}
        step={1}
        min={1}
        max={16}
        onChange={e => {
          setAnisotropyValue(Number(e.target.value));
        }}
      />
    </div>
  );
};

const SceneBackColor = () => {
  const threeExports = useAtomValue(threeExportsAtom);

  if (!threeExports) {
    return null;
  }

  const { scene } = threeExports;
  const [diffuseColor, setDiffuseColor] = useColor(
    scene.background ? `#${scene.background.getHexString()}` : '#ffffff',
  );

  return (
    <div
      key={`colorInfo-${scene.uuid}`}
      style={{
        fontSize: 11,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div className="flex gap-8">
        <strong>색상</strong>
        {/* <button
          style={{ fontSize: 10 }}
          onClick={() => {
            const hex = `#${originalColor}`;
            mat.emissive.set(hex);
            setDiffuseColor({
              hex: `#${originalColor}`,
              rgb: ColorService.toRgb(hex),
              hsv: ColorService.toHsv(hex),
            });
          }}
        >
          원래대로
        </button> */}
      </div>
      <div className="flex gap-2">
        <div
          className="w-[60px] h-[60px] mt-2 cursor-pointer"
          style={{ backgroundColor: diffuseColor.hex }}
        ></div>
        <div className="w-[120px] mt-2">
          <ColorPicker
            height={50} // 높이 px단위로 설정 (디폴트: 200)
            hideAlpha={true} // 투명도 조절바 숨김 (디폴트: 안숨김)
            color={diffuseColor} // 현재 지정된 컬러
            onChange={color => {
              scene.background = new THREE.Color(color.hex);
              setDiffuseColor(color);
            }} // 컬러 변경될 때마다 실행할 이벤트
          />
        </div>
      </div>
    </div>
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
      <TestControl />
      <GeneralMinimapControl></GeneralMinimapControl>
      <AnisotropyControl></AnisotropyControl>
      <GeneralPostProcessingControl></GeneralPostProcessingControl>
      <SceneBackColor></SceneBackColor>
      <GeneralSceneInfo></GeneralSceneInfo>

      <CameraInfoSection></CameraInfoSection>
    </div>
  );
};

export default SceneInfo;
