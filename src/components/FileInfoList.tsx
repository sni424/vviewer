import React from "react"
import { formatNumber } from "../scripts/utils"
import { FileInfo } from "../types"

const FileInfoList = ({ filelist = [], containerStyle = {}, itemStyle = {}, itemProps = {} }: { filelist?: FileInfo[], containerStyle?: React.CSSProperties, itemStyle?: React.CSSProperties, itemProps?: React.HTMLProps<HTMLLIElement> }) => {
    return <ul style={{ ...containerStyle }}>{filelist.map((fileinfo, i) => {
        return <li style={{ fontSize: 12, marginBottom: 3, ...itemStyle }} key={"filelist" + fileinfo.fileUrl} {...itemProps} data-fileinfo={JSON.stringify(fileinfo)}>{i + 1}. {fileinfo.filename} ({formatNumber(fileinfo.fileSize / (1024 * 1024))}mb) - {new Date(fileinfo.uploadDate).toLocaleString()}</li>
    })}</ul>
}

export default FileInfoList;