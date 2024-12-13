import { useAtomValue } from "jotai";
import { selectedAtom, threeExportsAtom } from "../../scripts/atoms";
import { THREE } from "../../scripts/VTHREE";

const _SelectBox = () => {
    const selecteds = useAtomValue(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    if (!threeExports) {
        return null;
    }

    if (selecteds.length === 0) {
        const { scene } = threeExports;
        const deletes: string[] = [];
        scene.traverse(obj => {
            if (obj.userData.boxhelper) {
                deletes.push(obj.uuid);
            }
        })
        scene.remove(...deletes.map(uuid => scene.getObjectByProperty("uuid", uuid)!));
        return;
    }

    const { scene } = threeExports;
    const existings: string[] = [];
    scene.traverse(obj => {
        if (obj.userData.boxhelper) {
            existings.push(obj.uuid);
        }
    })
    const keeps: string[] = [];
    const deletes: string[] = [];
    const adds: string[] = [];
    selecteds.forEach(select => {
        // add to keeps, deletes, adds
        if (existings.includes(select)) {
            keeps.push(select);
        } else {
            adds.push(select);
        }
    })
    existings.forEach(existing => {
        if (!selecteds.includes(existing)) {
            deletes.push(existing);
        }
    });
    deletes.forEach(deleteUuid => {
        const helper = scene.getObjectByProperty("uuid", deleteUuid);
        if (helper) {
            scene.remove(helper);
        }
    });
    adds.forEach(addUuid => {
        const selectedObject = scene.getObjectByProperty("uuid", addUuid);
        if (!selectedObject) {
            return;
        }
        const helper = new THREE.BoxHelper(selectedObject, 0xff0000);
        helper.layers.set(5);
        helper.userData.boxhelper = true;
        scene.add(helper);
    });

    return null;

}

const SelectBox = () => {
    const selecteds = useAtomValue(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    if (!threeExports) {
        return null;
    }

    if (selecteds.length === 0) {
        const { scene } = threeExports;
        const deletes: THREE.Object3D[] = [];
        scene.traverse(obj => {
            if (obj.userData.boxhelper || obj.type === "BoxHelper" || obj.type === "Box3Helper") {
                deletes.push(obj);
            }
        })
        // console.log("Deletes length : ", deletes.length);
        scene.remove(...deletes);
        return;
    }

    const { scene } = threeExports;
    const existings: string[] = [];
    scene.traverse(obj => {
        if (obj.userData.boxhelper) {
            existings.push(obj.uuid);
        }
    })
    const keeps: string[] = [];
    const deletes: string[] = [];
    const adds: string[] = [];
    selecteds.forEach(select => {
        // add to keeps, deletes, adds
        if (existings.includes(select)) {
            keeps.push(select);
        } else {
            adds.push(select);
        }
    })
    existings.forEach(existing => {
        if (!selecteds.includes(existing)) {
            deletes.push(existing);
        }
    });
    deletes.forEach(deleteUuid => {
        const helper = scene.getObjectByProperty("uuid", deleteUuid);
        if (helper) {
            scene.remove(helper);
        }
    });
    adds.forEach(addUuid => {
        const selectedObject = scene.getObjectByProperty("uuid", addUuid);
        if (!selectedObject) {
            return;
        }

        const cloned = selectedObject.clone();
        if (cloned instanceof THREE.Mesh) {
            cloned.material = new THREE.MeshBasicMaterial({
                color: 0xff0000
            });
            cloned.material.wireFrame = true;

            (((cloned as THREE.Mesh).material) as THREE.MeshStandardMaterial).wireframe = true;
            cloned.material.depthTest = false;
        }
        cloned.userData.boxhelper = true;
        cloned.layers.set(5);

        scene.add(cloned);
    });

    return null;

}

export default SelectBox;