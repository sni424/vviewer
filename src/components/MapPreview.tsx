import { useAtom, useAtomValue } from 'jotai';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import {
  ktxTexturePreviewCachedAtom,
  MaterialSlot,
  ProbeAtom,
  useModal,
  wallOptionAtom,
} from '../scripts/atoms';
import { threes, wallOptionToWalls } from '../scripts/atomUtils.ts';
import VMaterial from '../scripts/material/VMaterial.ts';
import { applyMultiProbe } from '../scripts/probeUtils.ts';
import ReflectionProbe from '../scripts/ReflectionProbe.ts';
import { THREE } from '../scripts/VTHREE';
import { ProbeTypes, WallCreateOption } from '../types.ts';

export interface MapPreviewProps {
  material: VMaterial;
  matKey: MaterialSlot;
  width?: number;
  height?: number;
}

export const FullscreenCanvas = ({ texture }: { texture: THREE.Texture }) => {
  const { closeModal } = useModal();
  const innerCanvasRef = useRef<HTMLCanvasElement>(null);
  const maxHeight = window.innerHeight - 100;
  const maxWidth = window.innerWidth - 100;
  const aspect = texture.image.width / texture.image.height;
  const [cachedTexture, setCachedTexture] = useAtom(
    ktxTexturePreviewCachedAtom,
  );
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
    const isKtx = texture.vUserData?.mimeType === 'image/ktx2';
    innerCanvasRef.current.width = dstWidth;
    innerCanvasRef.current.height = dstHeight;
    const renderer = new THREE.WebGLRenderer();
    const m = new THREE.MeshBasicMaterial();
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const plane = new THREE.Mesh(planeGeometry, m);

    if (isKtx) {
      const t = texture as THREE.CompressedTexture;
      const cache = cachedTexture[t.uuid];
      let src;
      if (cache) {
        src = cache;
      } else {
        const isLightMap = t.channel === 1;
        if (isLightMap) {
          t.channel = 0;
        }
        m.map = t;

        // WebGL 렌더러 생성
        renderer.setSize(t.image.width, t.image.height);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        // 텍스처를 표시할 PlaneMesh 생성
        scene.add(plane);

        // WebGLRenderer를 사용하여 Canvas로 변환
        renderer.render(scene, camera);

        if (isLightMap) {
          t.channel = 1;
        }

        // Canvas 데이터를 2D Context로 가져오기
        const glCanvas = renderer.domElement;
        src = glCanvas.toDataURL();
      }
      const context = innerCanvasRef.current.getContext('2d');

      if (context) {
        const image = new Image();
        image.src = src; // WebGL Canvas를 이미지로 변환
        image.onload = () => {
          const scale = Math.min(
            dstWidth / image.width,
            dstHeight / image.height,
          );
          const newWidth = image.width * scale;
          const newHeight = image.height * scale;

          // 캔버스 중앙에 맞추기 위한 위치 계산
          const offsetX = (dstWidth - newWidth) / 2;
          const offsetY = (dstHeight - newHeight) / 2;

          // 비율 유지하면서 캔버스에 이미지 그리기
          context.clearRect(0, 0, dstWidth, dstHeight);
          context.drawImage(image, offsetX, offsetY, newWidth, newHeight);
        };
      } else {
        console.warn('Cannot Draw KTX image: Canvas 2D Context Not Supported');
      }
    } else {
      innerCanvasRef.current
        .getContext('2d')
        ?.drawImage(texture.image, 0, 0, dstWidth, dstHeight);
    }

    return () => {
      renderer.dispose();
      renderer.forceContextLoss();
      m.dispose();
      planeGeometry.dispose();
    };
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

const MapPreview: React.FC<MapPreviewProps> = ({
  material,
  width,
  height,
  matKey: mapKey,
}) => {
  const texture = material[mapKey as keyof VMaterial] as THREE.Texture;
  const { openModal, closeModal } = useModal();
  const probes = useAtomValue(ProbeAtom);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isKtx = texture?.vUserData?.mimeType === 'image/ktx2';
  const hasImage = texture && texture.image;
  const [materialPreviewCache, setMaterialPreviewCache] = useAtom(
    ktxTexturePreviewCachedAtom,
  );
  const cannotDraw =
    mapKey === 'envMap' ||
    texture?.vUserData?.isExr ||
    (isKtx && texture?.mipmaps?.length === 0);

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
    const renderer = new THREE.WebGLRenderer();
    const m = new THREE.MeshBasicMaterial();
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const plane = new THREE.Mesh(planeGeometry, m);

    try {
      if (isKtx) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          const t = texture as THREE.CompressedTexture;
          const cache = materialPreviewCache[t.uuid];
          let src;
          if (cache) {
            src = cache;
          } else {
            if (mapKey === 'lightMap') {
              t.channel = 0;
            }
            m.map = t;
            // WebGL 렌더러 생성
            renderer.setSize(t.image.width, t.image.height);

            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
            camera.position.z = 1;

            // 텍스처를 표시할 PlaneMesh 생성
            scene.add(plane);

            // WebGLRenderer를 사용하여 Canvas로 변환
            renderer.render(scene, camera);

            if (mapKey === 'lightMap') {
              t.channel = 1;
            }

            // Canvas 데이터를 2D Context로 가져오기
            const glCanvas = renderer.domElement;
            src = glCanvas.toDataURL();
          }

          const image = new Image();
          image.src = src;
          image.onload = () => {
            // 원본 이미지 비율 유지하면서 축소하기 위해 비율 계산
            const scale = Math.min(w / image.width, h / image.height);
            const newWidth = image.width * scale;
            const newHeight = image.height * scale;

            // 캔버스 중앙에 맞추기 위한 위치 계산
            const offsetX = (w - newWidth) / 2;
            const offsetY = (h - newHeight) / 2;

            // 비율 유지하면서 캔버스에 이미지 그리기
            context.clearRect(0, 0, w, h);
            context.drawImage(image, offsetX, offsetY, newWidth, newHeight);
          };

          setMaterialPreviewCache(prev => {
            const p = { ...prev };
            p[t.uuid] = src;
            return p;
          });
        } else {
          console.warn(
            'Cannot Draw KTX image: Canvas 2D Context Not Supported',
          );
        }
      } else {
        canvasRef.current
          .getContext('2d')
          ?.drawImage(texture.image, 0, 0, w, h);
      }
    } catch (e) {
      console.error(e);
    }

    return () => {
      renderer.dispose();
      renderer.forceContextLoss();
      m.dispose();
      planeGeometry.dispose();
    };
  }, [texture]);

  if (cannotDraw) {
    if (mapKey === 'envMap') {
      if (material.envMap && material.envMap.vUserData.isCustomEnvMap) {
        return <TextureMappingChanger texture={material.envMap} />;
      } else {
        return (
          <div className="my-1">
            {probes.length > 0 ? (
              <ProbeSelector material={material}></ProbeSelector>
            ) : (
              <span>생성된 프로브가 없습니다.</span>
            )}
          </div>
        );
      }
    } else if (texture) {
      return (
        <div style={{ fontSize: 11, color: '#555' }}>
          표시불가 {isKtx ? '(KTX)' : '(HDR)'}
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
      {!hasImage ? (
        '없음'
      ) : (
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
      )}
    </div>
  );
};

const prepareWalls = (wallInfo: WallCreateOption) => {
  const retval = [] as {
    start: THREE.Vector3;
    end: THREE.Vector3;
    probeId: string;
  }[];
  const WALLS = wallOptionToWalls(wallInfo);
  const points = WALLS.points;
  const targetProbes = WALLS.probes;
  WALLS.walls.forEach(wall => {
    const startNumber = points[wall[0]];
    const endNumber = points[wall[1]];
    const start = new THREE.Vector3(startNumber[0], 0, startNumber[1]);
    const end = new THREE.Vector3(endNumber[0], 0, endNumber[1]);

    const probeId = targetProbes[wall[2]];

    retval.push({ start, end, probeId });
  });

  return retval;
};

const applyMultiProbeOnMaterial = async (
  material: VMaterial,
  probes: ReflectionProbe[],
  probeIds: string[],
  walls?: { start: THREE.Vector3; end: THREE.Vector3; probeId: string }[],
) => {
  const filtered = probes.filter(p => probeIds.includes(p.getId()));

  // 기존 싱글 프로브 제거
  if (material.envMap) {
    material.vUserData.envMap = material.envMap;
  }
  material.envMap = null;

  applyMultiProbe(material, filtered, walls);
  const { gl } = threes()!;
  // console.log(gl.info.programs?.map(p => p.cacheKey));
  material.needsUpdate = true;
};

function applySingleProbeOnMaterial(
  material: VMaterial,
  probe: ReflectionProbe,
) {
  material.envMap = probe.getRenderTargetTexture();
  material.updateEnvUniforms(probe.getCenter(), probe.getSize());
  material.vUserData.probeId = probe.getId();
  material.needsUpdate = true;

  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, gl) => {
    prev(shader, gl);
    delete shader.defines!['V_ENV_MAP'];
    shader.defines!['BOX_PROJECTED_ENV_MAP'] = 1;
  };
}

const SELECTING_PROBE = '__SELECTING_PROBE__';
const MultiProbeSelector = ({
  material,
  useWall,
}: {
  material: VMaterial;
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
      applyMultiProbeOnMaterial(material, probes, probeSelections, walls);
    }
  }, [probeSelections, useWall]);

  return (
    <>
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
    </>
  );
};

const ProbeSelector = ({ material }: { material: VMaterial }) => {
  const probes = useAtomValue(ProbeAtom);
  const isMulti = Boolean(material?.vUserData.probeIds);
  const [multiprobe, setMultiprobe] = useState<ProbeTypes>(
    material.vUserData.probeType ?? 'single',
  );
  const [_, forceRerender] = useState(0);

  useEffect(() => {
    material.vUserData.probeType = multiprobe;

    // 싱글프로브에서 멀티로 전환된 경우
    if (
      (multiprobe === 'multi' || multiprobe === 'multiWall') &&
      typeof material.vUserData.probeId === 'string'
    ) {
      material.vUserData.probeIds = [material.vUserData.probeId];
      material.vUserData.probeId = undefined;
      // applyMultiProbeOnMaterial(material, probes, material.vUserData.probeIds);
      forceRerender(p => p + 1);

      return;
    }

    // 멀티프로브에서 싱글로 전환된 경우
    if (
      !multiprobe &&
      Array.isArray(material.vUserData.probeIds) &&
      material.vUserData.probeIds.length > 0
    ) {
      const probeId = material.vUserData.probeIds[0];
      console.log('멀티프로브에서 싱글로 전환된 경우, probeId:', probeId);
      material.vUserData.probeId = probeId;
      material.vUserData.probeIds = undefined;
      applySingleProbeOnMaterial(
        material,
        probes.find(p => p.getId() === probeId)!,
      );
      forceRerender(p => p + 1);
      return;
    }

    // 싱글이 없지만 멀티를 초기화하는 경우
    if (
      multiprobe &&
      !material.vUserData.probeIds &&
      !Boolean(material.vUserData.probeId)
    ) {
      material.vUserData.probeIds = [];
      forceRerender(p => p + 1);
      return;
    }
  }, [multiprobe]);

  if (!material) {
    return null;
  }

  return (
    <Fragment>
      <input
        type="radio"
        name="probeType"
        checked={multiprobe === 'single'}
        onChange={() => setMultiprobe('single')}
      ></input>
      <label
        onClick={() => {
          setMultiprobe('single');
        }}
      >
        단일
      </label>
      <input
        type="radio"
        name="probeType"
        checked={multiprobe === 'multi'}
        onChange={() => setMultiprobe('multi')}
      ></input>
      <label
        onClick={() => {
          setMultiprobe('multi');
        }}
      >
        멀티
      </label>
      <input
        type="radio"
        name="probeType"
        checked={multiprobe === 'multiWall'}
        onChange={() => setMultiprobe('multiWall')}
      ></input>
      <label
        onClick={() => {
          setMultiprobe('multiWall');
        }}
      >
        멀티+벽
      </label>

      {(multiprobe === 'multi' || multiprobe === 'multiWall') &&
      Array.isArray(material?.vUserData.probeIds) ? (
        <MultiProbeSelector
          material={material}
          useWall={multiprobe === 'multiWall'}
        />
      ) : (
        <SingleProbeSelector material={material} />
      )}
    </Fragment>
  );
};

const SingleProbeSelector = ({ material }: { material: VMaterial }) => {
  const probes = useAtomValue(ProbeAtom);
  const [value, setValue] = useState(material.vUserData.probeId ?? 'none');

  useEffect(() => {
    if (value === 'none') {
      // Unreachable
      return;
    }
    if (value === 'delete') {
      if (material.vUserData.envMap) {
        material.envMap = material.vUserData.envMap;
      }
      delete material.vUserData.probeId;
      material.needsUpdate = true;
    } else {
      const probe = probes.find(probe => probe.getId() === value);
      if (probe) {
        applySingleProbeOnMaterial(material, probe);
      }
    }
  }, [value]);

  return (
    <select
      style={{ maxWidth: 120 }}
      onChange={e => setValue(e.target.value)}
      value={value}
    >
      <option defaultValue={value} value="none" style={{ display: 'none' }}>
        프로브를 선택하세요.
      </option>
      {material.envMap && <option value="delete">ENV 삭제</option>}
      {probes.map(probe => (
        <option key={Math.random()} value={probe.getId()}>
          {probe.getName()}
        </option>
      ))}
    </select>
  );
};

const TextureMappingChanger = ({ texture }: { texture: THREE.Texture }) => {
  const [mapping, setMapping] = useState<THREE.AnyMapping>(texture.mapping);
  const [flipY, setFlipY] = useState(texture.flipY);
  const mappings = {
    UVMapping: THREE.UVMapping,
    EquirectangularReflectionMapping: THREE.EquirectangularReflectionMapping,
    EquirectangularRefractionMapping: THREE.EquirectangularRefractionMapping,
    CubeReflectionMapping: THREE.CubeReflectionMapping,
    CubeRefractionMapping: THREE.CubeRefractionMapping,
    CubeUVReflectionMapping: THREE.CubeUVReflectionMapping,
  };

  useEffect(() => {
    texture.flipY = flipY;
    texture.needsUpdate = true;
  }, [flipY]);

  useEffect(() => {
    texture.mapping = mapping;
    texture.needsUpdate = true;
  }, [mapping]);

  return (
    <>
      <select
        value={mapping}
        onChange={e => setMapping(Number(e.target.value) as any)}
      >
        {Object.keys(mappings).map(m => (
          <option value={(mappings as any)[m]}>{m}</option>
        ))}
      </select>
      <input
        type="checkbox"
        checked={flipY}
        onChange={event => setFlipY(event.target.checked)}
      />
    </>
  );
};

export default MapPreview;
