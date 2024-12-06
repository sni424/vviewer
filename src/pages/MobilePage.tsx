import React, { useEffect, useState } from 'react'
import { FileInfo } from '../types';
import useFilelist from '../scripts/useFilelist';
import FileInfoList from '../components/FileInfoList';
import { decompressFileToObject } from '../scripts/utils';
import { clear, get, set } from 'idb-keyval';
import { decompress } from 'three/examples/jsm/Addons.js';
import objectHash from 'object-hash';
import { openLoaderAtom, sceneAnalysisAtom, threeExportsAtom, useBenchmark } from '../scripts/atoms';
import { THREE } from '../scripts/VTHREE';
import { Canvas, useThree } from '@react-three/fiber';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { OrbitControls } from '@react-three/drei';

const Loader = () => {
  const [openLoader, setOpenLoader] = useAtom(openLoaderAtom);
  const { filelist, loading } = useFilelist();
  const [downloading, setDownloading] = useState(false);
  const { benchmark, addBenchmark } = useBenchmark();
  const threeExports = useAtomValue(threeExportsAtom);

  if (!openLoader) {
    return null;
  }

  if (loading || !threeExports) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        fontSize: '2rem',
      }}>
        loading...
      </div>
    )
  }

  const models = filelist?.filter(fileinfo => fileinfo.filename.endsWith(".gltf") || fileinfo.filename.endsWith(".glb"));
  const envs = filelist?.filter(fileinfo => fileinfo.filename.endsWith(".hdr") || fileinfo.filename.endsWith(".exr"));

  return <div style={{
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "lightgray",
    padding: 16,
    boxSizing: "border-box",
    borderRadius: 8,
  }}>
    <button onClick={async () => {

      const latestHashUrl = import.meta.env.VITE_LATEST_HASH;
      const latestUrl = import.meta.env.VITE_LATEST;
      if (!latestUrl || !latestHashUrl) {
        alert(".env에 환경변수를 설정해주세요, latestUrl latestHashUrl");
        return;
      }
      addBenchmark("start");
      addBenchmark("downloadStart");
      setDownloading(true);

      const localLatestHash = await get("latest-hash");
      const remoteLatestHash = await (await decompressFileToObject<{ hash: string }>(latestHashUrl)).hash;
      alert("remoteLatestHash:" + remoteLatestHash);

      const loadModel = async () => {
        if (!localLatestHash || localLatestHash !== remoteLatestHash) {
          return decompressFileToObject(latestUrl).then(async (res) => {
            // alert("decompressFileToObject+" + JSON.stringify(res))

            await set("latest-hash", remoteLatestHash);
            await set("latest", res);
            // await set("latest", JSON.stringify(res));
            return res;
          }).catch((e) => {
            alert("모델을 불러오는데 실패했습니다." + e.message);
          })
        } else {
          // return JSON.parse((await get("latest"))!);
          return get("latest");
        }
      }

      loadModel().then((res) => {
        addBenchmark("downloadEnd");
        addBenchmark("parseStart");
        const loader = new THREE.ObjectLoader();
        const parsedScene = loader.parse(res);
        threeExports.scene.add(parsedScene);
      }).catch(e => {
        console.error(e);
        alert("모델을 불러오는데 실패했습니다. : " + e.message);
      }).finally(() => {
        alert("로드모델")
        setDownloading(false);
        setOpenLoader(false);
      })

    }}>최신업로드 불러오기</button><button onClick={() => {
      clear().then(() => {
        alert("캐시비우기완료")
      });
    }}>캐시비우기</button>

    <FileInfoList filelist={models} />
  </div>

}

const Renderer = () => {
  const setThreeExports = useSetAtom(threeExportsAtom);
  const threeExports = useThree();

  useEffect(() => {
    setThreeExports(threeExports);
  }, []);

  return <>
    <OrbitControls />
    {/* <ambientLight intensity={0.5} />
    <pointLight position={[10, 10, 10]} /> */}
  </>;
}

function MobilePage() {

  return <div style={{
    width: "100dvw",
    height: "100dvh",
  }}>
    <Canvas>
      <Renderer></Renderer>
    </Canvas>
    <Loader></Loader>
  </div>
}

export default MobilePage