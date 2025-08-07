import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { THREE } from 'VTHREE';

const globalGl = {
  gl: new THREE.WebGLRenderer(),
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  ),

  render() {
    const { gl, scene, camera } = globalGl;
    gl.render(scene, camera);
  },
};

const { gl, scene, camera } = globalGl;
gl.setPixelRatio(window.devicePixelRatio);
gl.setSize(window.innerWidth, window.innerHeight);

camera.position.z = 5;
camera.lookAt(0, 0, 0);

let hasAdded = false;
function TestPage() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current && !hasAdded) {
      gl.domElement.style.position = 'absolute';
      gl.domElement.style.top = '0';
      gl.domElement.style.left = '0';
      gl.domElement.style.width = '100%';
      gl.domElement.style.height = '100%';
      // gl.domElement.style.zIndex = '-1';
      container.current.appendChild(gl.domElement);
      hasAdded = true;

      const { scene } = globalGl;
      scene.background = new THREE.Color(0x000000);
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));

      const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
      const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
      boxMesh.position.set(2, 0, 0);
      scene.add(boxMesh);
      // globalGl.camera.position.z = 5;

      // const orbitControls = new OrbitControls(globalGl.camera, gl.domElement);
      // orbitControls.enableDamping = true;
      // orbitControls.dampingFactor = 0.25;
      // orbitControls.enabled = true;

      // globalGl.render();
    }

    return () => {
      if (container.current && hasAdded) {
        container.current.removeChild(gl.domElement);
        hasAdded = false;
      }
    };
  }, []);

  return (
    <div className="fullscreen" ref={container}>
      <Canvas
        className="w-full h-full"
        gl={gl}
        camera={camera}
        scene={scene}
        eventSource={container.current!}
        // onCreated={state => {
        //   state.camera.position.set(0, 0, 5);
        //   state.camera.lookAt(0, 0, 0);
        // }}
      >
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        <ambientLight intensity={2} />
        {/* <OrbitControls camera={camera} domElement={gl.domElement} /> */}
        <OrbitControls camera={camera} domElement={container.current!} />
      </Canvas>
    </div>
  );
}

export default TestPage;
