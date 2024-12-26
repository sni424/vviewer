import { clear } from 'idb-keyval';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import { __UNDEFINED__ } from '../../Constants';
import { envAtom, filelistAtom, openLoaderAtom } from '../../scripts/atoms';
import useFilelist from '../../scripts/useFilelist';
import { toNthDigit } from '../../scripts/utils';

const ContrastController = () => {
  return null;
};

const EnvController = () => {
  const { filelist, loading } = useFilelist();
  const [env, setEnv] = useAtom(envAtom);

  if (loading) {
    return null;
  }

  return (
    <section style={{ width: '100%' }}>
      <strong>환경맵</strong>
      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column' }}>
        <div>
          <select
            value={env.select}
            onChange={e => {
              setEnv({
                select: e.target.value as 'none' | 'preset' | 'custom' | 'url',
              });
            }}
          >
            <option value="none">없음</option>
            <option value="preset">프리셋</option>
            <option value="custom">업로드한 환경맵</option>
            <option value="url">URL</option>
          </select>
        </div>
      </div>
      {env.select === 'preset' && (
        <>
          <div
            style={{
              display: env.select === 'preset' ? 'flex' : 'none',
              flexDirection: 'column',
              marginTop: 4,
            }}
          >
            <select
              style={{ width: '50%' }}
              value={env.preset}
              onChange={e => {
                setEnv({
                  ...env,
                  preset: e.target.value as
                    | 'apartment'
                    | 'city'
                    | 'dawn'
                    | 'forest'
                    | 'lobby'
                    | 'night'
                    | 'park'
                    | 'studio'
                    | 'sunset'
                    | 'warehouse',
                });
              }}
            >
              <option value="apartment">아파트</option>
              <option value="city">도시</option>
              <option value="dawn">새벽</option>
              <option value="forest">숲</option>
              <option value="lobby">로비</option>
              <option value="night">밤</option>
              <option value="park">공원</option>
              <option value="studio">스튜디오</option>
              <option value="sunset">일몰</option>
              <option value="warehouse">창고</option>
            </select>
            <div style={{ width: '100%' }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={env.intensity ?? 1}
                onChange={e => {
                  setEnv({
                    ...env,
                    intensity: parseFloat(e.target.value),
                  });
                }}
              ></input>
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                Intensity : {toNthDigit(env.intensity ?? 1, 2)}
              </span>
            </div>
          </div>
        </>
      )}
      {env.select === 'custom' && (
        <>
          <div
            style={{
              display: env.select === 'custom' ? 'flex' : 'none',
              flexDirection: 'column',
              marginTop: 4,
            }}
          >
            <select
              value={env.url ?? __UNDEFINED__}
              onChange={e => {
                setEnv({ select: 'custom', url: e.target.value });
              }}
            >
              <option value={__UNDEFINED__}>선택</option>
              {filelist.envs.map(fileinfo => {
                return (
                  <option
                    key={`customenvmap-${fileinfo.fileUrl}`}
                    value={fileinfo.fileUrl}
                  >
                    {fileinfo.filename}
                  </option>
                );
              })}
            </select>
            <div style={{ width: '100%' }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={env.intensity ?? 1}
                onChange={e => {
                  setEnv({
                    ...env,
                    intensity: parseFloat(e.target.value),
                  });
                }}
              ></input>
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                Intensity : {toNthDigit(env.intensity ?? 1, 2)}
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

const _EnvController = () => {
  const [env, setEnv] = useAtom(envAtom);
  // const [envUrl, setEnvUrl] = useEnvUrl();
  const { envs } = useAtomValue(filelistAtom);

  return (
    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column' }}>
      환경맵
      <div style={{ display: 'inline-block' }}>
        <select
          value={env.select}
          onChange={e => {
            setEnv({ select: e.target.value as 'none' | 'preset' | 'custom' });
          }}
        >
          <option value="none">없음</option>
          <option value="preset">프리셋</option>
          <option value="custom">커스텀</option>
        </select>
      </div>
      {env.select === 'preset' && (
        <>
          <div
            style={{
              display: env.select === 'preset' ? 'flex' : 'none',
              flexDirection: 'column',
              marginTop: 4,
            }}
          >
            <select
              style={{ width: '50%' }}
              value={env.preset}
              onChange={e => {
                setEnv({
                  ...env,
                  preset: e.target.value as
                    | 'apartment'
                    | 'city'
                    | 'dawn'
                    | 'forest'
                    | 'lobby'
                    | 'night'
                    | 'park'
                    | 'studio'
                    | 'sunset'
                    | 'warehouse',
                });
              }}
            >
              <option value="apartment">아파트</option>
              <option value="city">도시</option>
              <option value="dawn">새벽</option>
              <option value="forest">숲</option>
              <option value="lobby">로비</option>
              <option value="night">밤</option>
              <option value="park">공원</option>
              <option value="studio">스튜디오</option>
              <option value="sunset">일몰</option>
              <option value="warehouse">창고</option>
            </select>
            <div style={{ width: '100%' }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={env.intensity ?? 1}
                onChange={e => {
                  setEnv({
                    ...env,
                    intensity: parseFloat(e.target.value),
                  });
                }}
              ></input>
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                Intensity : {toNthDigit(env.intensity ?? 1, 2)}
              </span>
            </div>
          </div>
        </>
      )}
      {env.select === 'custom' && (
        <>
          <div
            style={{
              width: '100%',
            }}
          >
            가져온 환경맵 :
            <select
              value={env.url ?? '-'}
              onChange={e => {
                setEnv({
                  ...env,
                  url: e.target.value,
                });
              }}
            >
              <option value="-">선택</option>
              {envs.map(envInfo => {
                return (
                  <option
                    key={`file-${envInfo.fileUrl}`}
                    value={envInfo.fileUrl}
                  >
                    {envInfo.filename}
                  </option>
                );
              })}
            </select>
            <div style={{ width: '100%' }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={env.intensity ?? 1}
                onChange={e => {
                  setEnv({
                    ...env,
                    intensity: parseFloat(e.target.value),
                  });
                }}
              ></input>
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                Intensity : {toNthDigit(env.intensity ?? 1, 2)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function MobileControlPanel() {
  const setOpenDownload = useSetAtom(openLoaderAtom);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: 'lightgray',
        display: 'flex',
        padding: 8,
        boxSizing: 'border-box',
        fontSize: '0.8rem',
        overflowY: 'auto',
        maxHeight: open ? '40vh' : 120,
        transition: 'max-height 0.5s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <EnvController></EnvController>
        <ContrastController></ContrastController>
      </div>

      <div
        style={{
          // position: "absolute",
          // right: 4,
          // top: 4,
          display: 'grid',
          flexDirection: 'column',
          width: 140,
          // 2 cols
          gridTemplateColumns: '1fr 1fr',
        }}
      >
        <button
          onClick={() => {
            setOpen(prev => !prev);
          }}
        >
          {open ? '패널닫기' : '패널열기'}
        </button>
        <button
          onClick={() => {
            setOpenDownload(prev => true);
          }}
        >
          모델추가
        </button>
        <button
          onClick={() => {
            window.location.reload();
          }}
        >
          새로고침
        </button>
        <button
          onClick={() => {
            clear();
          }}
        >
          캐시삭제
        </button>
      </div>
    </div>
  );
}

export default MobileControlPanel;
