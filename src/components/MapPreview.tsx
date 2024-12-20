import React, { useEffect, useRef } from 'react';
import { THREE } from '../scripts/VTHREE';
import { useModal } from '../scripts/atoms';

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
    | 'lightMap'
    | 'specularMap'
    | 'clearcoatMap'
    | 'clearcoat';
  width?: number;
  height?: number;
}

const FullscreenCanvas = ({ texture }: { texture: THREE.Texture }) => {
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isGainmap = texture?.colorSpace === 'srgb-linear';
  const hasImage = texture && texture.image && !isGainmap;
  const cannotDraw = mapKey === 'envMap' || isGainmap;

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
    console.log(texture);
    console.log(texture.image);
    canvasRef.current.getContext('2d')?.drawImage(texture.image, 0, 0, w, h);
  }, [texture]);

  if (cannotDraw) {
    if (texture) {
      return <div style={{ fontSize: 11, color: '#555' }}>표시불가(HDR)</div>;
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

export default MapPreview;
