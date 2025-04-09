import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

// Declare BASIS type on the window
declare global {
  interface Window {
    BASIS: any;
  }
}

// Load Basis Encoder WASM
const loadBasisEncoder = async (): Promise<any> => {
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = '/basis_universal/basis_encoder.js';
    script.onload = () => {
      window
        .BASIS({
          locateFile: () => '/basis_universal/basis_encoder.wasm',
        })
        .then((basisInstance: any) => {
          resolve(basisInstance);
        });
    };
    document.body.appendChild(script);
  });
};

const convertDataTextureToKTX2 = async (
  dataTexture: THREE.DataTexture,
): Promise<Blob> => {
  const basisEncoder = await loadBasisEncoder();

  const width = dataTexture.width;
  const height = dataTexture.height;
  const imageData = dataTexture.data;

  const basisFile = new basisEncoder.BasisFile();
  basisFile.init(imageData, width, height, {
    uastc: true,
    mip_gen: true,
  });

  const ktx2Data = basisFile.writeKTX2File();
  basisFile.delete();

  return new Blob([ktx2Data], { type: 'application/octet-stream' });
};

const EXRToKTX2Converter: React.FC = () => {
  const [status, setStatus] = useState('Drop an EXR file to convert');
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer?.files.length) {
      const file = event.dataTransfer.files[0];
      if (file.name.endsWith('.exr')) {
        const reader = new FileReader();
        reader.onload = async () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const loader = new EXRLoader();
          const texture = loader.parse(arrayBuffer) as THREE.DataTexture;
          debugger;
          setStatus('Converting to KTX2...');
          try {
            const blob = await convertDataTextureToKTX2(texture);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'converted.ktx2';
            a.click();
            URL.revokeObjectURL(url);
            setStatus('KTX2 file downloaded!');
          } catch (e) {
            console.error(e);
            setStatus('Failed to convert to KTX2');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setStatus('Only .exr files are supported');
      }
    }
  }, []);

  useEffect(() => {
    const drop = dropRef.current;
    if (!drop) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };

    drop.addEventListener('drop', handleDrop);
    drop.addEventListener('dragover', handleDragOver);

    return () => {
      drop.removeEventListener('drop', handleDrop);
      drop.removeEventListener('dragover', handleDragOver);
    };
  }, [handleDrop]);

  return (
    <div
      ref={dropRef}
      style={{
        border: '2px dashed #ccc',
        padding: '40px',
        textAlign: 'center',
        margin: '20px',
        borderRadius: '10px',
      }}
    >
      <p>{status}</p>
      <p>Drag and drop an EXR file here to convert it to KTX2.</p>
    </div>
  );
};

export default EXRToKTX2Converter;
