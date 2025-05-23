import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import './DracoViewer.css';

interface DracoMesh {
  geometry: THREE.BufferGeometry;
  // position: [number, number, number];
}

const Scene: React.FC<{
  setLoaded: (num: number) => void;
  dracoFiles: File[];
}> = ({ dracoFiles, setLoaded }) => {
  const [meshes, setMeshes] = useState<DracoMesh[]>([]);
  const dracoLoader = new DRACOLoader();
  const loadedRef = useRef(0);

  useEffect(() => {
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    dracoLoader.setDecoderConfig({ type: 'js' }); // Use JS decoder

    const loadDracoFile = async (file: File, index: number) => {
      const url = URL.createObjectURL(file);
      try {
        const geometry = await new Promise<THREE.BufferGeometry>(
          (resolve, reject) => {
            dracoLoader.load(
              url,
              (geom: THREE.BufferGeometry) => resolve(geom),
              undefined,
              // (err: Error) => reject(err),
            );
          },
        );
        geometry.computeVertexNormals(); // Ensure normals for lighting
        setMeshes(prev => [
          ...prev,
          {
            geometry,
            // position: [(index % 3) * 2 - 2, Math.floor(index / 3) * 2 - 2, 0],
          },
        ]);
        URL.revokeObjectURL(url); // Clean up URL
      } catch (err) {
        console.error(`Error loading ${file.name}:`, err);
      }
    };

    dracoFiles.forEach((file, index) => {
      loadDracoFile(file, index).then(() => {
        loadedRef.current += 1;
        setLoaded(loadedRef.current);
      });
    });

    return () => {
      dracoLoader.dispose();
      meshes.forEach(mesh => mesh.geometry.dispose()); // Clean up geometries
    };
  }, [dracoFiles]);

  return (
    <>
      <Environment preset="apartment" />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      {meshes.map((mesh, index) => (
        <mesh key={index} geometry={mesh.geometry} scale={0.001}>
          <meshStandardMaterial color="gray" />
        </mesh>
      ))}
      <OrbitControls />
    </>
  );
};

const DracoViewer: React.FC = () => {
  const [dracoFiles, setDracoFiles] = useState<File[]>([]);
  const [loaded, setLoaded] = useState(0);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files).filter(file =>
      file.name.toLowerCase().endsWith('.drc'),
    );
    setDracoFiles(prev => [...prev, ...files]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div
      className="canvas-container"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} key={'the-canvas'}>
        <Scene dracoFiles={dracoFiles} setLoaded={setLoaded} />
      </Canvas>
      {dracoFiles.length === 0 ? (
        <div className="drop-overlay">Drop .drc files here</div>
      ) : (
        <div className="absolute top-0 left-0 bg-white">
          Loaded : {loaded} / {dracoFiles.length}
        </div>
      )}
    </div>
  );
};

export default DracoViewer;
