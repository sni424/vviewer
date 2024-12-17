import { useEffect, useState } from 'react';
import { sceneAnalysisAtom, useBenchmark } from '../../scripts/atoms';
import { formatNumber } from '../../scripts/utils';
import { useAtomValue } from 'jotai';

const MobileBenchmarkPanel = () => {
  const { benchmark } = useBenchmark();
  const hasBenchmark = Boolean(benchmark?.start);
  // 그냥 0.5초마다 리렌더
  const [_, _set] = useState(0);
  const analysis = useAtomValue(sceneAnalysisAtom);

  useEffect(() => {
    const interval = setInterval(() => {
      _set(prev => prev + 1);
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!hasBenchmark) {
    return null;
  }

  const isDownloading = benchmark.downloadStart && !benchmark.downloadEnd;
  const downloadFinished = benchmark.downloadStart && benchmark.downloadEnd;
  const downloadElapsed = isDownloading
    ? Date.now() - benchmark.downloadStart!
    : downloadFinished
      ? benchmark.downloadEnd! - benchmark.downloadStart!
      : undefined;

  const isParsing = benchmark.parseStart && !benchmark.parseEnd;
  const parsingFinished = benchmark.parseStart && benchmark.parseEnd;
  const parsingElapsed = isParsing
    ? Date.now() - benchmark.parseStart!
    : parsingFinished
      ? benchmark.parseEnd! - benchmark.parseStart!
      : undefined;

  const isSceneAdding = benchmark.sceneAddStart && !benchmark.sceneAddEnd;
  const sceneAddingFinished = benchmark.sceneAddStart && benchmark.sceneAddEnd;
  const sceneAddingElapsed = isSceneAdding
    ? Date.now() - benchmark.sceneAddStart!
    : sceneAddingFinished
      ? benchmark.sceneAddEnd! - benchmark.sceneAddStart!
      : undefined;

  const finished = benchmark.end !== 0;
  const elapsed = finished ? benchmark.end! - benchmark.start! : undefined;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 1001,
        display: 'flex',
        fontSize: '0.8rem',
        gap: 8,
      }}
    >
      {analysis && (
        <div
          style={{
            width: 150,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          <div>Mesh</div>
          <div>{formatNumber(analysis.meshCount)}</div>
          <div>Vertex</div>
          <div>{formatNumber(analysis.vertexCount)}</div>
          <div>Triangle</div>
          <div>{formatNumber(analysis.triangleCount)}</div>
          <div style={{ fontSize: '0.65rem' }}>Max Vert Mesh</div>
          <div>{formatNumber(analysis.maxVertexInMesh)}</div>
          <div style={{ fontSize: '0.65rem' }}>Max Tri Mesh</div>
          <div>{formatNumber(analysis.maxTriangleInMesh)}</div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          width: 140,
          // 2 cols
          gridTemplateColumns: '1fr 1fr',
        }}
      >
        <div>시작</div>
        <div style={{ fontSize: '0.7rem' }}>
          {new Date(benchmark.start!).toLocaleTimeString()}
        </div>
        {downloadElapsed ? (
          <>
            {' '}
            <div>다운로드</div>
            <div>{formatNumber(downloadElapsed)}ms </div>
          </>
        ) : null}
        {parsingElapsed ? (
          <>
            {' '}
            <div>파싱</div>
            <div>{formatNumber(parsingElapsed)}ms </div>
          </>
        ) : null}
        {sceneAddingElapsed ? (
          <>
            {' '}
            <div>씬 추가</div>
            <div>{formatNumber(sceneAddingElapsed)}ms </div>
          </>
        ) : null}
        {elapsed ? (
          <>
            {' '}
            <div style={{ fontWeight: 'bold' }}>TOTAL</div>
            <div style={{ fontWeight: 'bold' }}>{formatNumber(elapsed)}ms </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default MobileBenchmarkPanel;
