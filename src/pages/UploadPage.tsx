import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useState } from 'react'
import { FileInfo } from '../types';
import { useNavigate } from 'react-router-dom';

const sourceAtom = atom<{
    name: string;
    url: string;
    file: File;
}[]>([]);

const useDragAndDrop = () => {
    const [isDragging, setIsDragging] = useState(false);
    const setSourceUrls = useSetAtom(sourceAtom);

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
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

    return {
        isDragging,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    }
}

const FileInfoList = ({ filelist }: { filelist: FileInfo[] }) => {
    return <ul>{filelist.map((fileinfo, i) => {
        return <li style={{ fontSize: 12, marginBottom: 3 }} key={"filelist" + fileinfo.fileUrl}>{i + 1}. {fileinfo.filename} ({fileinfo.fileSize}) - {new Date(fileinfo.uploadDate).toLocaleString()}</li>
    })}</ul>
}

function Upload() {
    const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useDragAndDrop();
    const [uploading, setUploading] = useState(false);
    const [source, setSource] = useAtom(sourceAtom);
    const [filelist, setFilelist] = useState<FileInfo[] | null>(null);

    useEffect(() => {
        const uploadUrl = import.meta.env.VITE_UPLOAD_URL;
        if (!uploadUrl) {
            alert(".env에 환경변수를 설정해주세요, uploadUrl");
            return;
        }


        if (source.length === 0) {
            return;
        }

        Promise.all(source.map(({ name, url, file }) => {
            const data = new FormData();
            data.append("file", file);
            setUploading(true);
            return fetch(uploadUrl, {
                method: "POST",
                body: data,
            }).then(res => res.json()).then(console.log)
        })).finally(() => {
            setUploading(false);
            setSource([]);
            alert("업로드 완료")
            window.location.reload();
        })
    }, [source]);

    useEffect(() => {
        const filelistUrl = import.meta.env.VITE_FILELIST_URL;
        if (!filelistUrl) {
            alert(".env에 환경변수를 설정해주세요");
            return;
        }

        fetch(filelistUrl).then(res => res.json()).then(filelist =>
            setFilelist(filelist)
        ).catch(e => {
            console.error(e);
            alert("파일리스트를 불러오는데 실패했습니다. : " + e.message);
        });

    }, []);

    if (uploading) {
        return <div style={{
            width: "100dvw",
            height: "100dvh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "2rem",
            fontWeight: "bold",
            color: "white",
            backgroundColor: "rgba(0,0,0,0.5)"
        }}>Uploading...</div>
    }

    const models = filelist?.filter(fileinfo => fileinfo.filename.endsWith(".gltf") || fileinfo.filename.endsWith(".glb"));
    const envs = filelist?.filter(fileinfo => fileinfo.filename.endsWith(".hdr") || fileinfo.filename.endsWith(".exr"));

    return (
        <div style={{
            width: "100dvw",
            height: "100dvh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
        }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div style={{ marginBottom: 16 }}>
                드래그&드랍으로 파일 업로드
            </div>
            <a style={{ marginBottom: 16 }} href={"/"}>돌아가기</a>
            {filelist ? <>
                <div style={{ marginTop: 20, marginBottom: 16 }}>파일목록</div>
                <div style={{ width: "80%", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    <div>모델</div><div>환경맵</div>
                    <FileInfoList filelist={models || []} />
                    <FileInfoList filelist={envs || []} />
                </div>
            </>
                : <div style={{ color: "lightgray" }}>파일리스트를 불러오는 중...</div>}

        </div>
    )
}



export default Upload
