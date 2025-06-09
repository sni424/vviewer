import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

interface MeshoptGeometry {
  geometry: THREE.BufferGeometry;
}

const parseMeshoptBuffer = async (
  buffer: ArrayBuffer,
): Promise<THREE.BufferGeometry> => {
  const view = new DataView(buffer);
  const vertexCount = view.getUint32(0, true);
  const indexCount = view.getUint32(4, true);

  const positionsOffset = 8;
  const positionsLength = vertexCount * 3;
  const indicesOffset = positionsOffset + positionsLength * 4;

  const positions = new Float32Array(buffer, positionsOffset, positionsLength);
  const indices = new Uint32Array(buffer, indicesOffset, indexCount);

  // ---- UV 파싱 (Encoder.cpp와 포맷 일치)
  const uvCountOffset = indicesOffset + indexCount * 4;
  const uvCount = view.getUint32(uvCountOffset, true);
  let uvDataOffset = uvCountOffset + 4;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  for (let i = 0; i < uvCount; ++i) {
    const uvs = new Float32Array(buffer, uvDataOffset, vertexCount * 2);
    geometry.setAttribute(
      i === 0 ? 'uv' : 'uv' + (i + 1),
      new THREE.BufferAttribute(uvs, 2),
    );
    uvDataOffset += vertexCount * 2 * 4;
  }

  geometry.computeVertexNormals();
  return geometry;
};

const Scene: React.FC<{ files: File[]; setLoaded: (n: number) => void }> = ({
  files,
  setLoaded,
}) => {
  const [meshes, setMeshes] = useState<MeshoptGeometry[]>([]);
  const loadedRef = useRef(0);

  useEffect(() => {
    MeshoptDecoder.ready.then(() => {
      files.forEach(async (file, i) => {
        try {
          const buffer = await file.arrayBuffer();
          const geometry = await parseMeshoptBuffer(buffer);
          setMeshes(prev => [...prev, { geometry }]);
          loadedRef.current += 1;
          setLoaded(loadedRef.current);
        } catch (err) {
          console.error(`Failed to load ${file.name}:`, err);
        }
      });
    });

    return () => {
      meshes.forEach(m => m.geometry.dispose());
    };
  }, [files, setLoaded]);

  return (
    <>
      <Environment preset="apartment" />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geometry} scale={0.001}>
          <meshStandardMaterial color="gray" />
        </mesh>
      ))}
      <OrbitControls />
    </>
  );
};

const MeshoptViewer: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loaded, setLoaded] = useState(0);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const dropped = Array.from(event.dataTransfer.files).filter(f =>
      f.name.endsWith('.bin'),
    );
    setFiles([...files, ...dropped]);
  };

  return (
    <div
      className="fixed inset-0 w-full h-full"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Scene files={files} setLoaded={setLoaded} />
      </Canvas>
      {files.length === 0 ? (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-4 bg-black bg-opacity-70 text-white text-2xl rounded-md pointer-events-none select-none">
          Drop .bin files here
        </div>
      ) : (
        <div className="absolute top-0 left-0 m-2 bg-white px-4 py-2 text-sm rounded shadow">
          Loaded: {loaded} / {files.length}
        </div>
      )}
    </div>
  );
};

export default MeshoptViewer;
