import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { v4 } from 'uuid';

const SceneRenderer = ({ scene }: { scene: THREE.Scene }) => {
  const { gl, camera } = useThree();

  useFrame(() => {
    gl.render(scene, camera);
  }, 1);

  return null;
};

// mesh[] 또는 material[] 비교
// 배열:배열로 돌면 n^2
// map:map으로 돌면 n
function diffArrays<T>(src: T[], target: T[], keyFunc: (obj: T) => string) {
  const aMap = new Map(src.map(item => [keyFunc(item), item]));
  const bMap = new Map(target.map(item => [keyFunc(item), item]));

  const added = Array.from(bMap.entries())
    .filter(([uuid]) => !aMap.has(uuid))
    .map(([_, item]) => item);

  const removed = Array.from(aMap.entries())
    .filter(([uuid]) => !bMap.has(uuid))
    .map(([_, item]) => item);

  return { added, removed };
}

function flattenScene(scene: THREE.Scene) {
  const meshes: THREE.Mesh[] = [];
  const materials: THREE.Material[] = [];
  scene.traverse(node => {
    if (node.asMesh.isMesh) {
      meshes.push(node as THREE.Mesh);
      const mesh = node.asMesh;
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material: THREE.Material) =>
            materials.push(material),
          );
        } else {
          materials.push(mesh.material);
        }
      }
    }
  });

  return { meshes, materials };
}

function addId<T extends { isMesh?: boolean; vUserData: { id?: string } }>(
  ...objects: T[]
) {
  objects.forEach(object => {
    if (object?.vUserData?.id) {
      return;
    }

    if (!object.vUserData) {
      object.vUserData = {};
    }

    object.vUserData.id = v4();

    if (object.isMesh) {
      const mat = (object as unknown as THREE.Mesh).material as THREE.Material;

      if (!mat.vUserData) {
        mat.vUserData = {};
      }

      if (!mat.vUserData.id) {
        mat.vUserData.id = v4();
      }
    }

    return;
  });
}

export default function App() {
  const sceneARef = useRef<THREE.Scene>(new THREE.Scene());
  const sceneBRef = useRef<THREE.Scene>(new THREE.Scene());

  const [activeScene, setActiveScene] = useState<THREE.Scene | null>(null);

  useEffect(() => {
    // Scene A - 기본 사각형 하나
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 'red' });
    const cube = new THREE.Mesh(geometry, material);
    cube.layers.enableAll();
    sceneARef.current.add(cube);

    addId(cube);

    // Scene B - A를 복제 후, 파란 박스 하나 추가
    sceneBRef.current = sceneARef.current.clone(true);

    const geometry2 = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material2 = new THREE.MeshBasicMaterial({ color: 'blue' });
    const smallCube = new THREE.Mesh(geometry2, material2);
    smallCube.position.set(2, 0, 0);
    smallCube.layers.enableAll();
    sceneBRef.current.add(smallCube);
    addId(smallCube);

    setActiveScene(sceneARef.current); // 초기값은 A 씬
  }, []);

  return (
    <div className="w-screen h-screen relative">
      <Canvas camera={{ position: [0, 0, 5] }}>
        {activeScene && <SceneRenderer scene={activeScene} />}
        <OrbitControls></OrbitControls>
      </Canvas>
      <div className="absolute top-4 left-4 flex gap-2">
        <button onClick={() => setActiveScene(sceneARef.current)}>
          Show Scene A
        </button>
        <button onClick={() => setActiveScene(sceneBRef.current)}>
          Show Scene B
        </button>
        <button
          onClick={() => {
            const randomBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.5, 0.5, 0.5),
              new THREE.MeshBasicMaterial({ color: 'green' }),
            );
            randomBox.position.set(
              Math.random() * 2 - 1,
              Math.random() * 2 - 1,
              Math.random() * 2 - 1,
            );
            randomBox.layers.enableAll();
            addId(randomBox);
            sceneARef.current.add(randomBox);
          }}
        >
          Add box to A
        </button>
        <button
          onClick={() => {
            const a = flattenScene(sceneARef.current);
            const b = flattenScene(sceneBRef.current);

            const { added, removed } = diffArrays(
              a.meshes,
              b.meshes,
              o => o.vUserData.id!,
            );
            console.log('Added:', added);
            console.log('Removed:', removed);

            const { added: addedM, removed: removedM } = diffArrays(
              a.materials,
              b.materials,
              o => o.vUserData.id!,
            );
            console.log('Added Materials:', addedM);
            console.log('Removed Materials:', removedM);
          }}
        >
          Compare A&B
        </button>
      </div>
    </div>
  );
}
