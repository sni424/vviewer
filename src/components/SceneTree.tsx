import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { materialSelectedAtom, selectedAtom, threeExportsAtom } from "../scripts/atoms";
import { useState } from "react";
import { THREE } from "../scripts/VTHREE";

const MeshChildren = ({ data }: { data: THREE.Mesh }) => {
    const material = data.material as THREE.Material;
    const [mat, setMaterialSelected] = useAtom(materialSelectedAtom);
    return <div style={{
        paddingLeft: 28,
        display: "flex",
        justifyContent: "space-between",
        cursor: "pointer",
    }}
        onClick={() => {

            setMaterialSelected(prev => {
                if (!prev) {
                    return material;
                }
                if (prev.uuid === material.uuid) {
                    return null;
                } else {
                    return material;
                }
            });

        }}
    >
        <div style={{
            fontSize: 11,
            backgroundColor: mat?.uuid === material.uuid ? "#888" : undefined
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


    return <div style={{ width: "100%", paddingLeft: depth * 4, fontSize: 12, marginTop: 2 }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", textAlign: "center", backgroundColor: selecteds.includes(data.uuid) ? "#bbb" : undefined }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "start" }}>
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
                }}>&gt;</div> <div style={{
                    width: "calc(100% - 16px)",
                    color: data.name.length === 0 ? "#666" : "#000", cursor: "pointer",
                    // single line with ellipsis
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "inline-block"
                }} onClick={(e) => {
                    console.log(data);
                    // console.log(data.type, data.name, data.uuid)
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
                </div>
            </div>

            <div style={{ fontSize: 10, color: "#555" }}>{data.type}
                <div style={{ cursor: "pointer", marginLeft: 4, width: 40, height: 16, border: "1px solid #999", backgroundColor: hidden ? "#bbb" : "white", textAlign: "center", display: "inline-block" }} onClick={() => {
                    if (threeExports) {
                        setHidden(!hidden);
                        data.visible = hidden;
                        const { gl, scene, camera } = threeExports;
                        gl.render(scene, camera);
                    }


                }}>{hidden ? "보이기" : "숨기기"}</div>
            </div>
        </div>
        <div style={{ display: "flex", justifyContent: "end", flexDirection: "column" }}>
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