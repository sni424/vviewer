import { useAtomValue } from "jotai";
import { threeExportsAtom } from "./atoms";
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

    const type = data.type as "Scene" | "Mesh" | "Group" | "Object3D";
    console.log(data.type);

    const [open, setOpen] = useState(["Scene", "Object3D", "Group"].includes(type) ? true : false);
    const openable = type === "Group" || type === "Object3D" || type === "Mesh";

    if (type === "Object3D") {
        console.log(data);
    }


    return <div style={{ width: "100%", paddingLeft: depth * 4, fontSize: 12, marginTop: 2 }}>
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
                    color: data.name.length === 0 ? "#666" : "#000"
                }}>
                    {data.name.length === 0 ? "<이름없음>" : data.name}
                </span>
            </div>

            <div style={{ fontSize: 10, color: "#555" }}>{data.type}</div>
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
    console.log("rendered")

    // return <ObjectViewer data={scene}></ObjectViewer>
    return <div style={{ width: "100%", padding: 8, height: "100%", overflow: "auto" }}> <RecursiveNode data={scene} depth={0}></RecursiveNode></div>
}

export default SceneTree;