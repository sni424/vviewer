import { useAtomValue } from "jotai";
import { loadHistoryAtom } from "./atoms";

const useFiles = () => {
    const loadingHistory = useAtomValue(loadHistoryAtom);
    const files = loadingHistory.reduce((returnFiles, value) => {
        returnFiles.files.push(value);
        if (value.end === 0) {
            returnFiles.loadingFiles.push(value);
        }
        return returnFiles;
    }
        , {
            files: [] as { name: string; start: number; end: number; file: File; }[],
            loadingFiles: [] as { name: string; start: number; end: number; }[],
        });
    return files;
};

export default useFiles;