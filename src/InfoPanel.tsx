import React, { useState } from 'react'
import { materialSelectedAtom, selectedAtom, threeExportsAtom, useModal } from './atoms';
import { useAtom, useAtomValue } from 'jotai';
import { THREE } from './VTHREE';
import { groupInfo } from './utils';

const ObjectView = ({ object }: { object: THREE.Object3D }) => {

    const info = groupInfo(object);

    return <div style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 4
    }}
        key={"infodetail-" + object.uuid}
    >
        <div style={{ fontSize: 13 }}>{object.name.length === 0 ? "이름없음" : object.name} - {object.type}</div>
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            paddingLeft: 8
        }}>
            <div style={{ fontSize: 10 }}>{object.uuid}</div>
            {Object.keys(object.userData).length > 0 && <div style={{ fontSize: 11 }}>유저데이터
                <div style={{ fontSize: 10 }}>
                    {Object.entries(object.userData as Record<string, any>).map(([key, value]) => {
                        return <div style={{ paddingLeft: 8 }} key={`info-${object.uuid}-${key}`}>{key}: {JSON.stringify(value).replace(/\"/g, "")}</div>
                    })}
                </div>
            </div>}

            {info.meshCount > 0 && <div style={{ fontSize: 11 }}>메쉬 {info.meshCount}개</div>}
            {info.triangleCount > 0 && <div style={{ fontSize: 11 }}>삼각형 {info.triangleCount}개</div>}
            {info.vertexCount > 0 && <div style={{ fontSize: 11 }}>버텍스 {info.vertexCount}개</div>}



        </div>

    </div>
}

const ApplyLightMapComponent = () => {
    const { closeModal } = useModal();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const selectedObjects = useAtomValue(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    if (!threeExports) {
        return null;
    }

    const { scene } = threeExports;
    const childrenMeshes: THREE.Mesh[] = [];
    const addMeshIfNotExists = (mesh: THREE.Object3D) => {
        if (mesh.type === "Mesh") {
            if (childrenMeshes.some(exist => exist.uuid === mesh.uuid)) {
                return;
            }
            childrenMeshes.push(mesh as THREE.Mesh);
        }
    }

    selectedObjects.forEach(uuid => {
        const obj = scene.getObjectByProperty("uuid", uuid);
        if (!obj) {
            return;
        }
        if (obj.type === "Mesh") {
            addMeshIfNotExists(obj)
        } else {
            const recursivelyAdd = (object: THREE.Object3D) => {
                object.children.forEach(addMeshIfNotExists);
                object.children.forEach(recursivelyAdd);
            }
            recursivelyAdd(obj);
        }
    })




    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        console.log("HERE")
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    };
    return <div style={{
        width: "50%", backgroundColor: "white", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column",
        cursor: isDragging ? "copy" : undefined,
        border: isDragging ? "2px dashed #000" : undefined,
        boxSizing: "border-box"
    }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);

            if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {

                const acceptedExtensions = ['.png', ".jpg"];
                const files = Array.from(event.dataTransfer.files);

                // Filter files by .gltf and .glb extensions
                const filteredFiles = files.filter((file) =>
                    acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
                );

                if (filteredFiles.length === 0) {
                    alert("Only .png and .jpg files are accepted.");
                    return;
                }

                if (filteredFiles.length > 0) {
                    setImageFile(filteredFiles[0]);
                }

                event.dataTransfer.clearData();
            }
        }}
        onMouseDown={(e) => { e.stopPropagation(); }}
        onMouseUp={(e) => {
            e.stopPropagation();
            console.log("onMoucseUp")
        }}
        onClick={(e) => {
            e.stopPropagation();
        }}
    >
        <div style={{ fontSize: 20, fontWeight: "bold" }}>라이트맵 일괄적용</div>
        <div style={{ fontSize: 12 }}>선택된 오브젝트 {selectedObjects.length}개의 하위 메쉬 {childrenMeshes.length}개에 라이트맵을 일괄적용합니다.</div>

        <div style={{ fontSize: 20, margin: 40, width: "100%", textAlign: "center", fontWeight: "bold" }}>라이트맵 드래그 & 드랍</div>
        {imageFile && <img src={URL.createObjectURL(imageFile)} style={{ width: "100%", height: 100, objectFit: "contain" }}></img>}
        <div style={{ width: "100%", display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
            <button onClick={() => {
                closeModal();
            }}>취소</button>
            <button onClick={() => {

                const texture = new THREE.TextureLoader().load(URL.createObjectURL(imageFile!));
                texture.flipY = !texture.flipY;
                texture.channel = 1;

                childrenMeshes.forEach(mesh => {
                    (mesh.material as THREE.MeshStandardMaterial).lightMap = texture;

                    (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;

                });
                closeModal();
            }} disabled={!imageFile}>적용</button>
        </div>
    </div>
}

function InfoPanel() {
    const [selecteds, setSelecteds] = useAtom(selectedAtom);
    const threeExports = useAtomValue(threeExportsAtom);
    const materialSelected = useAtomValue(materialSelectedAtom);
    const { openModal, closeModal } = useModal();


    if (selecteds.length === 0 || !threeExports) {
        return null;
    }

    const { scene } = threeExports;

    return (
        <div style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            maxHeight: materialSelected ? "calc(50% - 20px)" : "calc(100% - 20px)",
            width: 240,
            backgroundColor: "#bbbbbb99",
            padding: 8,
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            overflowY: "auto",
        }}


        >
            <div>{selecteds.length}개 선택됨</div>
            <button onClick={() => {
                openModal(<ApplyLightMapComponent />);
            }}> 라이트맵 일괄적용</button >
            {
                selecteds.map(selected => {
                    const found = scene.getObjectByProperty("uuid", selected);
                    if (!found) {
                        return null;
                    }
                    return <ObjectView key={`info-object-${found.uuid}`} object={found}></ObjectView>
                })
            }
            < div style={{ position: "absolute", top: 5, right: 5, fontSize: 12, fontWeight: "bold", cursor: "pointer" }} onClick={() => {
                setSelecteds([]);
            }}> X</div >
        </div >
    )
}

export default InfoPanel