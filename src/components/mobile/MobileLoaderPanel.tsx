import { clear } from 'idb-keyval';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useMemo, useState } from 'react';
import { THREE } from 'VTHREE';
import {
  openLoaderAtom,
  sceneAnalysisAtom,
  threeExportsAtom,
  useBenchmark,
} from '../../scripts/atoms';
import VGLTFLoader from '../../scripts/loaders/VGLTFLoader.ts';
import useFilelist from '../../scripts/useFilelist';
import { loadFile, loadLatest } from '../../scripts/utils';
import { FileInfo } from '../../types';
import FileInfoList from '../FileInfoList';

const MobileLoaderPanel = () => {
  const [loading, setLoading] = useState(false);
  const [openLoader, setOpenLoader] = useAtom(openLoaderAtom);
  const { filelist, loading: filelistLoading } = useFilelist();
  const [downloading, setDownloading] = useState(false);
  const { benchmark, addBenchmark } = useBenchmark();
  const threeExports = useAtomValue(threeExportsAtom);
  const setSceneAnalysis = useSetAtom(sceneAnalysisAtom);

  // const loaderRef = useRef(new VGLTFLoader(threeExports?.gl));
  const loader = useMemo(() => {
    if (!threeExports?.gl) {
      return null;
    }
    return new VGLTFLoader(threeExports!.gl);
  }, [threeExports]);

  if (!openLoader) {
    return null;
  }

  if (loading || filelistLoading || !threeExports || !loader) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100dvh',
          fontSize: '2rem',
        }}
      >
        loading...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '80%',
        maxHeight: '70%',
        position: 'absolute',
        top: '10%',
        left: '10%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'lightgray',
        padding: 16,
        boxSizing: 'border-box',
        borderRadius: 8,
        overflow: 'auto',
      }}
    >
      <div className="flex gap-8">
        <button
          onClick={async () => {
            setDownloading(true);
            loadLatest({
              threeExports,
              addBenchmark,
            })
              .then(async fileinfo => {})
              .finally(() => {
                setDownloading(false);
                setOpenLoader(false);
              });
          }}
        >
          최신업로드 불러오기
        </button>
        <button
          onClick={() => {
            clear().then(() => {
              alert('캐시비우기완료');
            });
          }}
        >
          캐시비우기
        </button>
      </div>

      <FileInfoList
        filelist={filelist.models}
        itemStyle={{ fontSize: 12, marginTop: 8, cursor: 'pointer' }}
        itemProps={{
          onClick: e => {
            try {
              const fileinfo = JSON.parse(
                e.currentTarget.getAttribute('data-fileinfo')!,
              ) as FileInfo;
              addBenchmark('start');
              addBenchmark('downloadStart');
              loadFile(fileinfo)
                .then(async blob => {
                  setDownloading(false);
                  addBenchmark('downloadEnd');
                  addBenchmark('parseStart');
                  const url = URL.createObjectURL(blob);
                  const { scene } = threeExports;

                  const gltf = await loader.loadAsync(url);
                  addBenchmark('parseEnd');
                  addBenchmark('sceneAddStart');

                  scene.add(gltf.scene);
                  const interval = setInterval(() => {
                    //@ts-ignore
                    const found = scene.getObjectByProperty(
                      'uuid',
                      gltf.scene.uuid,
                    );
                    if (found) {
                      // console.log("loaded", elapsed, "ms");

                      // 1초 후에 메시,버텍스, 트라이앵글 수 계산
                      setTimeout(() => {
                        let meshCount = 0;
                        let vertexCount = 0;
                        let triangleCount = 0;
                        let maxVertexInMesh = 0;
                        let maxTriangleInMesh = 0;
                        scene.traverse(obj => {
                          if (obj instanceof THREE.Mesh) {
                            meshCount++;
                            vertexCount +=
                              obj.geometry.attributes.position.count;
                            triangleCount += obj.geometry.index?.count ?? 0;
                            maxVertexInMesh = Math.max(
                              maxVertexInMesh,
                              obj.geometry.attributes.position.count,
                            );
                            maxTriangleInMesh = Math.max(
                              maxTriangleInMesh,
                              obj.geometry.index?.count ?? 0,
                            );
                          }
                        });
                        console.log('mesh count', meshCount);
                        console.log('vertex count', vertexCount);
                        console.log('triangle count', triangleCount);
                        console.log('max vertex in mesh', maxVertexInMesh);
                        console.log('max triangle in mesh', maxTriangleInMesh);
                        setSceneAnalysis({
                          meshCount,
                          vertexCount,
                          triangleCount,
                          maxVertexInMesh,
                          maxTriangleInMesh,
                        });
                      }, 1000);

                      clearInterval(interval);
                      addBenchmark('sceneAddEnd');
                      addBenchmark('end');
                    }
                  }, 30);
                })
                .finally(() => {
                  addBenchmark('sceneAddEnd');
                  addBenchmark('end');
                  setOpenLoader(false);
                });
            } catch (e) {
              console.error('error', e);
            }
          },
        }}
      />
    </div>
  );
};

export default MobileLoaderPanel;
