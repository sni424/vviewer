import { useAtomValue } from "jotai";
import { selectedAtom, threeExportsAtom, treeScrollToAtom } from "../../scripts/atoms";
import { THREE } from "../../scripts/VTHREE";
import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Layer } from "../../Constants";

const SelectBox = () => {
    const { scene } = useThree();
    const selecteds = useAtomValue(selectedAtom);
    const scrollSelected = useAtomValue(treeScrollToAtom);
    const objects = selecteds.map(uuid => scene.getObjectByProperty("uuid", uuid)).filter(Boolean) as THREE.Object3D[];
    const selectedMatRef = useRef<THREE.MeshBasicMaterial>(new THREE.MeshBasicMaterial({
        color: 0xeedd00,
        wireframe: true,
        depthTest: false,
        depthWrite: false,
        transparent: true,
    }));
    const orangeMatRef = useRef<THREE.MeshBasicMaterial>(new THREE.MeshBasicMaterial({
        color: 0xff6600,
        wireframe: true,
        depthTest: false,
        depthWrite: false,
        transparent: true,
    }));
    const meshes: THREE.Mesh[] = [];

    const addIfNotExists = (mesh: THREE.Mesh) => {
        if (!meshes.includes(mesh)) {
            meshes.push(mesh);
        }
    }
    const recursivelyAddMeshes = (obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
            addIfNotExists(obj);
        } else {
            obj.children.forEach(child => {
                recursivelyAddMeshes(child);
            })
        }
    };

    objects.forEach(recursivelyAddMeshes);

    return <>
        {meshes.map((mesh, i) => {
            const cloned = mesh.clone();
            if (scrollSelected === mesh.uuid) {
                cloned.material = orangeMatRef.current;
                cloned.renderOrder = 999;
            } else {
                cloned.material = selectedMatRef.current;
            }
            mesh.getWorldPosition(cloned.position);
            mesh.getWorldQuaternion(cloned.quaternion);
            mesh.getWorldScale(cloned.scale);
            mesh.layers.enable(Layer.Selected);
            return <primitive object={cloned} key={`selected-${cloned.uuid}`}></primitive>
        })}
    </>

}

export default SelectBox;