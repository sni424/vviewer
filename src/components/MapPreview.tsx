import { useAtom, useAtomValue } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import { THREE } from 'VTHREE';
import {
  ktxTexturePreviewCachedAtom,
  MaterialSlot,
  ProbeAtom,
  useModal,
} from '../scripts/atoms';

export interface MapPreviewProps {
  material: THREE.Material | THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
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
    const isHdr = texture.vUserData?.isHdr;
    innerCanvasRef.current.width = dstWidth;
    innerCanvasRef.current.height = dstHeight;
    const renderer = new THREE.WebGLRenderer();
    const m = new THREE.MeshBasicMaterial();
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const plane = new THREE.Mesh(planeGeometry, m);

    if (isKtx || isHdr) {
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
  const texture = material[mapKey as keyof THREE.Material] as THREE.Texture;
  const { openModal, closeModal } = useModal();
  const probes = useAtomValue(ProbeAtom);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isKtx = texture?.vUserData?.mimeType === 'image/ktx2';
  const isHdr = texture?.vUserData?.isHdr;
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
      if (isKtx || isHdr) {
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
      if (
        material.standard.envMap &&
        material.standard.envMap.vUserData.isCustomEnvMap
      ) {
        return <TextureMappingChanger texture={material.standard.envMap} />;
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
