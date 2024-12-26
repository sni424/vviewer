import React, { useEffect } from 'react';
import { cached, formatNumber } from '../scripts/utils';
import { FileInfo } from '../types';

const FileInfoComponent = ({
  fileInfo,
  i,
  itemStyle = {},
  itemProps = {},
}: {
  fileInfo: FileInfo;
  i: number;
  itemStyle?: React.CSSProperties;
  itemProps?: React.HTMLProps<HTMLLIElement>;
}) => {
  const [isCached, setIsCached] = React.useState(false);
  useEffect(() => {
    cached(fileInfo).then(isCached => {
      setIsCached(isCached);
    });
  }, []);
  return (
    <li
      style={{ ...itemStyle }}
      {...itemProps}
      data-fileinfo={JSON.stringify(fileInfo)}
    >
      {isCached && <span style={{ fontWeight: 'bold' }}>(캐시됨)</span>}
      {i + 1}. {fileInfo.filename} (
      {formatNumber(fileInfo.fileSize / (1024 * 1024))}mb) -{' '}
      {new Date(fileInfo.uploadDate).toLocaleString()}{' '}
    </li>
  );
};

const FileInfoList = ({
  filelist = [],
  containerStyle = {},
  itemStyle = {},
  itemProps = {},
}: {
  filelist?: FileInfo[];
  containerStyle?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
  itemProps?: React.HTMLProps<HTMLLIElement>;
}) => {
  return (
    <ul style={{ ...containerStyle }}>
      {filelist.map((fileInfo, i) => (
        <FileInfoComponent
          key={'filelist' + fileInfo.fileUrl}
          fileInfo={fileInfo}
          itemStyle={itemStyle}
          itemProps={itemProps}
          i={i}
        ></FileInfoComponent>
      ))}
    </ul>
  );
};

export default FileInfoList;
