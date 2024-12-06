import { formatNumber } from "../scripts/utils"
import { FileInfo } from "../types"

const FileInfoList = ({ filelist = [] }: { filelist?: FileInfo[] }) => {
    return <ul>{filelist.map((fileinfo, i) => {
        return <li style={{ fontSize: 12, marginBottom: 3 }} key={"filelist" + fileinfo.fileUrl}>{i + 1}. {fileinfo.filename} ({formatNumber(fileinfo.fileSize / (1024 * 1024))}mb) - {new Date(fileinfo.uploadDate).toLocaleString()}</li>
    })}</ul>
}

export default FileInfoList;