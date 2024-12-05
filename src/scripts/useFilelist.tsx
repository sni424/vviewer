import { useEffect, useState } from "react";
import { FileInfo } from "../types";

export default function useFilelist() {
    const [filelist, setFilelist] = useState<FileInfo[] | null>(null);
    useEffect(() => {
        const filelistUrl = import.meta.env.VITE_FILELIST_URL;
        if (!filelistUrl) {
            alert(".env에 환경변수를 설정해주세요");
            return;
        }

        fetch(filelistUrl, {cache: "no-store"}).then(res => res.json()).then((filelist: FileInfo[]) =>
            // 최신순으로 정렬
            setFilelist(filelist.reverse())
        ).catch(e => {
            console.error(e);
            alert("파일리스트를 불러오는데 실패했습니다. : " + e.message);
        });

    }, []);
    const loading = filelist === null;
    return { filelist, loading };
};
