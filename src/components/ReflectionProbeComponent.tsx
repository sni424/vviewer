// import { useAtom, useAtomValue } from 'jotai';
// import { orbitControlsAtom, selectedProbeAtom, showProbeAtom, threeExportsAtom } from '../scripts/atoms.ts';
// import { useEffect, useRef, useState } from 'react';
// import { TransformControls } from '@react-three/drei';
// import * as THREE from '../scripts/VTHREE.ts';
// import { v4 } from 'uuid';
// import { useThree } from '@react-three/fiber';
//
// const DEFAULT_RESOLUTION: ReflectionProbeResolutions = 256;
// const DEFAULT_POSITION: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
// const DEFAULT_SIZE: THREE.Vector3 = new THREE.Vector3(4, 4, 4);
// const ONE_VECTOR: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
// const REFLECTION_BOX_LAYER = 5;
// const CUBE_CAMERA_LAYER = 10;
//
// export type ReflectionProbeResolutions = 256 | 512 | 1024 | 2048;
//
// export function useProbe() {
//     const threeExports = useAtomValue(threeExportsAtom);
//
//     if (!threeExports) {
//         throw new Error('useProbe() must be used within threeExports');
//     }
// }
//
// export const ReflectionProbeComponent = () => {
//     const threeExports = useAtomValue(threeExportsAtom);
//     const [showProbe, setShowProbe] = useAtom<boolean>(showProbeAtom);
//
//     if (!threeExports) {
//         return null;
//     }
//
//     const { scene, gl, camera } = threeExports;
//
//     return (
//         <>
//
//         </>
//     );
// };
//
// const ReflectionProbe = () => {
//     // FROM OUT
//     const { scene, gl, camera } = useThree();
//     const [selectedProbe, setSelectedProbe] = useAtom(selectedProbeAtom);
//
//     // INNER PROPERTIES
//     const boxRef = useRef<THREE.Mesh>(null);
//     const sphereRef = useRef<THREE.Mesh>(null);
//     const [boxPosition, setBoxPosition] = useState<THREE.Vector3>(DEFAULT_POSITION);
//     const [size, setSize] = useState<THREE.Vector3>(DEFAULT_SIZE);
//     const [cameraPosition, setCameraPosition] = useState<THREE.Vector3>(DEFAULT_POSITION);
//     const [uuid, setUuid] = useState<string>(v4());
//
//     const box = new THREE.Box3().setFromCenterAndSize(DEFAULT_POSITION, ONE_VECTOR);
//     const boxHelper = new THREE.Box3Helper(box, '#00deff');
//     boxHelper.userData.isProbeMesh = true;
//
//     useEffect(() => {
//         if (boxRef.current) {
//             console.log(boxRef.current);
//         }
//     }, [boxRef.current]);
//
//     function getOpacity(): number {
//         if (boxRef.current) {
//             if (selectedProbe && selectedProbe === boxRef.current.uuid) {
//                 return 0.3;
//             }
//         }
//         return 0.1;
//     }
//
//     function onTranslateControlChange(event?: THREE.Event) {
//         if (event) {
//             // @ts-ignore
//             const object = event.target.object;
//             if (object) {
//                 setBoxPosition(object.position);
//                 console.log(object);
//             }
//         }
//     }
//
//     function onScaleControlChange(event?: THREE.Event) {
//         if (event) {
//             // @ts-ignore
//             const object = event.target.object;
//             const sphere = sphereRef.current;
//             if (object && sphere) {
//                 sphere.scale.copy(object.scale).revert();
//             }
//         }
//     }
//
//     function onBoxMeshClick(e: THREE.Event) {
//         // if (boxRef.current) {
//         //     setSelectedProbe(boxRef.current.uuid);
//         // }
//     }
//
//     return (
//         <>
//             <TransformControls
//                 object={boxRef.current}
//                 onObjectChange={onTranslateControlChange}
//                 mode="translate"
//                 size={0.7}
//                 userData={{ isTransformControl: true }}
//             />
//             <TransformControls
//                 object={boxRef.current}
//                 onChange={onScaleControlChange}
//                 mode="scale"
//                 size={0.5}
//                 userData={{ isTransformControl: true }}
//             />
//             <mesh
//                 ref={boxRef}
//                 uuid={uuid}
//                 position={[0, 0, 0]}
//                 layers={REFLECTION_BOX_LAYER}
//                 scale={[4, 4, 4]}
//                 userData={{ isProbeMesh: true }}
//                 onClick={onBoxMeshClick}
//             >
//                 <boxGeometry args={[1, 1, 1]} />
//                 <meshBasicMaterial
//                     color="#0077ff"
//                     transparent
//                     opacity={getOpacity()}
//                     polygonOffset
//                     polygonOffsetFactor={1}
//                     polygonOffsetUnits={1}
//                 />
//                 {/* CHILDREN */}
//                 <primitive object={boxHelper} />
//                 <mesh
//                     ref={sphereRef}
//                     position={[0, 0, 0]}
//                     scale={new THREE.Vector3().copy(DEFAULT_SIZE).revert()}
//                     layers={REFLECTION_BOX_LAYER}
//                     userData={{ isProbeMesh: true }}
//                 >
//                     <sphereGeometry args={[0.5, 32, 64]} />
//                     <meshStandardMaterial
//                         color="#FFFFFF"
//                         metalness={1}
//                         roughness={0}
//                         envMapIntensity={1}
//                     />
//                 </mesh>
//             </mesh>
//         </>
//     );
// };
//
// export default ReflectionProbe;