import { useAtom, useAtomValue } from "jotai";
import { selectedAtom, threeExportsAtom } from "./atoms";
import { useState } from "react";
import { THREE } from "./VTHREE";

const MeshChildren = ({ data }: { data: THREE.Mesh }) => {
    const material = data.material as THREE.Material;
    return <div style={{
        paddingLeft: 28,
        display: "flex",
        justifyContent: "space-between",
    }}>
        <div style={{
            fontSize: 11,
        }}>{material.name}</div>
        <div style={{
            fontSize: 10,
            color: "#555"

        }}>{material.type}</div>
    </div>;
}

const RecursiveNode = ({ data, depth = 0 }: { data: THREE.Object3D, depth: number }) => {

    const [selecteds, setSelecteds] = useAtom(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);

    const type = data.type as "Scene" | "Mesh" | "Group" | "Object3D" | "BoxHelper";

    const [open, setOpen] = useState(["Scene", "Object3D", "Group"].includes(type) ? true : false);
    const openable = type === "Group" || type === "Object3D" || type === "Mesh";
    const [hidden, setHidden] = useState(data.visible ? false : true);

    if (type === "BoxHelper") {
        return null;
    }


    return <div style={{ width: "100%", paddingLeft: depth * 4, fontSize: 12, marginTop: 2, backgroundColor: selecteds.includes(data.uuid) ? "#bbb" : undefined }}>
        <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center" }}>
            <div>
                <div style={{
                    transform: open ? "rotate(90deg)" : "rotate(0deg)",
                    width: 16, height: 16,
                    cursor: "pointer",
                    display: "inline-block",
                    textAlign: "center",
                }} onClick={() => {
                    if (openable) {
                        setOpen(!open);
                    }
                }}>&gt;</div> <span style={{
                    color: data.name.length === 0 ? "#666" : "#000", cursor: "pointer"
                }} onClick={(e) => {
                    console.log(data.type, data.name, data.uuid)
                    if (e.ctrlKey) {
                        if (selecteds.includes(data.uuid)) {
                            setSelecteds(selecteds.filter(uuid => uuid !== data.uuid));
                        } else {
                            setSelecteds([...selecteds, data.uuid]);
                        }
                    } else {
                        setSelecteds([data.uuid]);
                    }


                }}>
                    {data.name.length === 0 ? "<이름없음>" : data.name}
                </span>
            </div>

            <div style={{ fontSize: 10, color: "#555" }}>{data.type}
                <div style={{ cursor: "pointer", marginLeft: 4, width: 40, height: 16, border: "1px solid #999", backgroundColor: hidden?"#bbb":"white", textAlign: "center", display: "inline-block" }} onClick={() => {
                    if (threeExports) {
                        setHidden(!hidden);
                        data.visible = hidden;
                        const { gl, scene, camera } = threeExports;
                        gl.render(scene, camera);
                    }


                }}>{hidden ? "보이기" : "숨기기"}</div>
            </div>
        </div>
        <div>
            {open && data.type === "Mesh" && <MeshChildren data={data as THREE.Mesh}></MeshChildren>}
            {open && data.children.map((child, index) => {
                return <RecursiveNode key={index} data={child} depth={depth + 1}></RecursiveNode>
            }
            )}
        </div>
    </div >
}

const SceneTree = () => {
    const threeExports = useAtomValue(threeExportsAtom);
    if (!threeExports) {
        return null;
    }

    const { scene } = threeExports;

    // return <ObjectViewer data={scene}></ObjectViewer>
    return <div style={{ width: "100%", padding: 8, height: "100%", overflow: "auto" }}> <RecursiveNode data={scene} depth={0}></RecursiveNode></div>
}

export default SceneTree;