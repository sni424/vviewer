import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useState } from 'react'
import { FileInfo } from '../types';
import { formatNumber, loadFile } from '../scripts/utils';
import useFilelist from '../scripts/useFilelist';
import FileInfoList from './FileInfoList';
import { sourceAtom, useModal } from '../scripts/atoms';

const uploadSourceAtom = atom<{
    name: string;
    url: string;
    file: File;
}[]>([]);

function Upload() {

    const [uploading, setUploading] = useState(false);
    const [uploadSource, setUploadSource] = useAtom(uploadSourceAtom);
    const setSource = useSetAtom(sourceAtom);
    const { filelist } = useFilelist();
    const { closeModal } = useModal();

    const [isDragging, setIsDragging] = useState(false);
    const setSourceUrls = useSetAtom(uploadSourceAtom);



    useEffect(() => {
        const uploadUrl = import.meta.env.VITE_UPLOAD_URL;
        if (!uploadUrl) {
            alert(".env에 환경변수를 설정해주세요, uploadUrl");
            return;
        }


        if (uploadSource.length === 0) {
            return;
        }

        Promise.all(uploadSource.map(({ name, url, file }) => {
            const data = new FormData();
            data.append("file", file);
            setUploading(true);
            return fetch(uploadUrl, {
                method: "POST",
                body: data,
            }).then(res => res.json()).then(console.log)
        })).finally(() => {
            setUploading(false);
            setUploadSource([]);
            alert("업로드 완료")
            // window.location.reload();
        })
    }, [uploadSource]);

    if (uploading) {
        return <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "2rem",
            fontWeight: "bold",
            color: "white",
            backgroundColor: "rgba(0,0,0,0.5)"
        }}>Uploading...</div>
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {

            const acceptedExtensions = ['.gltf', '.glb', ".hdr", ".exr"];
            const files = Array.from(event.dataTransfer.files);

            // Filter files by .gltf and .glb extensions
            const filteredFiles = files.filter((file) =>
                acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
            );

            if (filteredFiles.length === 0) {
                alert("다음 확장자만 가능(대소문자구분) : .gltf, .glb, .hdr, .exr");
                return;
            }

            // Convert files to Blob URLs
            const fileUrls = filteredFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file), file }));
            setSourceUrls(fileUrls);

            event.dataTransfer.clearData();
        }
    };


    return (
        <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            border: isDragging ? "2px dashed black" : undefined,
        }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <div style={{ marginBottom: 16 }}>
                드래그&드랍으로 파일 업로드
                <button style={{marginLeft:20}} onClick={() => {
                    closeModal();
                }}>창 닫기</button>
            </div>
            {filelist ? <>
                <div style={{ marginTop: 20, marginBottom: 16 }}>파일목록</div>
                {/* <div style={{ width: "80%", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}> */}
                <div style={{ width: "80%", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    {/* <div>모델</div><div>환경맵</div><div>씬</div> */}
                    <strong>모델</strong><strong>환경맵</strong>
                    <FileInfoList filelist={filelist.models} itemStyle={{ cursor: "pointer", marginTop: 6 }} itemProps={
                        {
                            onClick: (e) => {
                                const file = JSON.parse(e.currentTarget.getAttribute("data-fileinfo")!) as FileInfo;
                                loadFile(file).then(blob => {
                                    console.log("loaded")
                                    const url = URL.createObjectURL(blob);
                                    const fileFromBlob = new File([blob], file.filename);
                                    setSource([{ url, name: file.filename, file: fileFromBlob }]);
                                    closeModal?.();
                                })

                            }
                        }
                    } />
                    <FileInfoList filelist={filelist.envs} />
                    {/* <FileInfoList filelist={filelist.scenes} /> */}
                </div>
            </>
                : <div style={{ color: "lightgray" }}>파일리스트를 불러오는 중...</div>}

        </div>
    )
}



export default Upload
