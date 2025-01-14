import { get } from 'idb-keyval';
import { useAtomValue } from 'jotai';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { ProbeAtom, useModal } from '../scripts/atoms';
import ReflectionProbe from '../scripts/ReflectionProbe.ts';
import { THREE } from '../scripts/VTHREE';

export interface MapPreviewProps {
  material: THREE.MeshStandardMaterial;
  matKey:
    | 'lightMap'
    | 'map'
    | 'emissiveMap'
    | 'bumpMap'
    | 'normalMap'
    | 'displacementMap'
    | 'roughnessMap'
    | 'metalnessMap'
    | 'alphaMap'
    | 'envMap'
    | 'aoMap'
    | 'gradientMap'
    | 'specularMap'
    | 'clearcoatMap'
    | 'clearcoat';
  width?: number;
  height?: number;
}

export const FullscreenCanvas = ({ texture }: { texture: THREE.Texture }) => {
  const { closeModal } = useModal();
  const innerCanvasRef = useRef<HTMLCanvasElement>(null);
  const maxHeight = window.innerHeight - 100;
  const maxWidth = window.innerWidth - 100;
  const aspect = texture.image.width / texture.image.height;
  let dstHeight = maxHeight;
  let dstWidth = maxHeight * aspect;
  if (dstWidth > maxWidth) {
    dstWidth = maxWidth;
    dstHeight = maxWidth / aspect;
  }
  const closer = () => {
    closeModal?.();
  };

  useEffect(() => {
    if (!innerCanvasRef.current) {
      return;
    }
    innerCanvasRef.current.width = dstWidth;
    innerCanvasRef.current.height = dstHeight;
    innerCanvasRef.current
      .getContext('2d')
      ?.drawImage(texture.image, 0, 0, dstWidth, dstHeight);
  }, []);
  return (
    <div className="h-full flex flex-col" onClick={closer}>
      <div className="h-20"></div>
      <div
        style={{
          width: dstWidth,
          height: dstHeight,
        }}
      >
        <canvas
          ref={innerCanvasRef}
          style={{ width: '100%', height: '100%' }}
          onClick={closer}
        ></canvas>
      </div>
      <div className="flex-1 min-w-0 bg-white flex items-end flex-col mt-5 mb-5 p-3 box-border">
        <div>가로 : {texture.image.width}px</div>
        <div>세로 : {texture.image.height}px</div>
      </div>
    </div>
  );
};

// TODO : 이미지를 캔버스에 그린 후 <img>에 박고 있는데, img태그를 그냥 canvas로 바꾸면 바로 그릴 수 있다
const MapPreview: React.FC<MapPreviewProps> = ({
  material,
  width,
  height,
  matKey: mapKey,
}) => {
  const texture = material[
    mapKey as keyof THREE.MeshStandardMaterial
  ] as THREE.Texture;
  const { openModal, closeModal } = useModal();
  const probes = useAtomValue(ProbeAtom);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isGainmap = Boolean(texture?.vUserData?.gainMap);
  const isKtx = texture?.vUserData?.mimeType === 'image/ktx2';
  const hasImage = texture && texture.image && !isGainmap;
  const cannotDraw =
    mapKey === 'envMap' || isGainmap || texture?.vUserData?.isExr || isKtx;

  useEffect(() => {
    if (cannotDraw) {
      // HDR이미지를 보여줄 수가 없다
      return;
    }

    if (!canvasRef.current) {
      return;
    }

    if (!hasImage) {
      canvasRef.current.width = 0;
      canvasRef.current.height = 0;
      return;
    }

    const w = width ?? 60;
    const h = height ?? 60;
    canvasRef.current.width = w;
    canvasRef.current.height = h;
    // const source = texture.image || texture.source.data;
    // console.log(texture.image);
    try {
      canvasRef.current.getContext('2d')?.drawImage(texture.image, 0, 0, w, h);
    } catch (e) {
      console.error(e);
    }
  }, [texture]);

  function onEnvMapSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    console.log(value);
    if (value === 'none') {
      // Unreachable
      return;
    }
    if (value === 'delete') {
      material.envMap = null;
      material.needsUpdate = true;
    } else {
      const probe = probes.find(probe => probe.getId() === value);
      if (probe) {
        material.envMap = probe.getTexture();
      }
    }
  }

  if (cannotDraw) {
    if (mapKey === 'envMap') {
      return (
        <div className="my-1">
          {probes.length > 0 ? (
            <ProbeSelector material={material} />
          ) : (
            <span>생성된 프로브가 없습니다.</span>
          )}
        </div>
      );
    } else if (texture) {
      return (
        <div style={{ fontSize: 11, color: '#555' }}>
          표시불가 {isKtx ? '(KTX)' : '(HDR)'}
          {isGainmap && texture.vUserData.gainMap ? (
            <>
              <br></br>
              <div>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    const urlOrName = texture.vUserData.gainMap as string;

                    if (urlOrName.startsWith('http')) {
                      a.href = urlOrName as string;
                      const name = urlOrName.split('/').pop()!;
                      a.download = name;
                      a.click();
                    } else {
                      console.log(urlOrName);
                      get(urlOrName).then((jpg: File) => {
                        if (jpg) {
                          const url = URL.createObjectURL(jpg);
                          a.href = url;
                          a.download = jpg.name;
                          a.click();
                        } else {
                          const jpgCandidate = urlOrName.replace(
                            '.exr',
                            '.jpg',
                          );
                          get(jpgCandidate).then((jpg: File) => {
                            if (jpg) {
                              const url = URL.createObjectURL(jpg);
                              a.href = url;
                              a.download = jpg.name;
                              a.click();
                            }
                          });
                        }
                      });
                    }
                  }}
                >
                  게인맵다운로드
                </button>
              </div>
            </>
          ) : null}
        </div>
      );
    } else {
      return <div>없음</div>;
    }
  }

  return (
    <div
      style={{
        width: hasImage ? (width ?? 60) : undefined,
        height: hasImage ? (height ?? 60) : undefined,
        backgroundClip: 'gray',
        borderRadius: 8,
      }}
    >
      {!hasImage ? '없음' : null}
      <canvas
        style={{ width: '100%', height: '100%', cursor: 'pointer' }}
        ref={canvasRef}
        onClick={() => {
          if (!hasImage) {
            return;
          }
          openModal(() => (
            <FullscreenCanvas texture={texture}></FullscreenCanvas>
          ));
        }}
      ></canvas>
    </div>
  );
};

const ProbeSelector = ({
  material,
}: {
  material: THREE.MeshStandardMaterial;
}) => {
  const probes = useAtomValue(ProbeAtom);
  const [value, setValue] = useState(material.vUserData.probeId ?? 'none');

  function applyProbeOnMaterial(
    material: THREE.MeshStandardMaterial,
    probe: ReflectionProbe,
  ) {
    material.envMap = probe.getTexture();
    material.onBeforeCompile = probe.materialOnBeforeCompileFunc();
    material.vUserData.probeId = value;
  }

  useEffect(() => {
    if (value === 'none') {
      // Unreachable
      return;
    }
    if (value === 'delete') {
      material.envMap = null;
      delete material.vUserData.probeId;
      material.needsUpdate = true;
    } else {
      const probe = probes.find(probe => probe.getId() === value);
      if (probe) {
        applyProbeOnMaterial(material, probe);
      }
    }
  }, [value]);

  return (
    <select
      style={{ maxWidth: 120 }}
      onChange={e => setValue(e.target.value)}
      value={value}
    >
      <option selected value="none" style={{ display: 'none' }}>
        프로브를 선택하세요.
      </option>
      {material.envMap && <option value="delete">ENV 삭제</option>}
      {probes.map(probe => (
        <option value={probe.getId()}>{probe.getName()}</option>
      ))}
    </select>
  );
};

export default MapPreview;
