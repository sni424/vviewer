import { OrbitControls } from '@react-three/drei'
import { Canvas, RootState, useThree } from '@react-three/fiber'
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';
import VGLTFLoader from './VGLTFLoader';
import ObjectViewer from './ObjectViewer';
import { formatNumber, groupInfo } from './utils';

declare global {
  interface Map<K, V> {
    reduce<T>(callback: (accumulator: T, value: V, key: K, map: Map<K, V>) => T, initialValue: T): T;
  }
}

Map.prototype.reduce = function <K, V, T>(
  this: Map<K, V>,
  callback: (accumulator: T, value: V, key: K, map: Map<K, V>) => T,
  initialValue: T
): T {
  let accumulator = initialValue;
  for (const [key, value] of this) {
    accumulator = callback(accumulator, value, key, this);
  }
  return accumulator;
};

const selectedAtom = atom<string[]>([]);
const sourceAtom = atom<{ name: string; url: string; file: File }[]>([]);
const loadHistoryAtom = atom<Map<string, { name: string; start: number; end: number; file: File, uuid: string; }>>(new Map());
const threeExportsAtom = atom<RootState>();

const Tabs = ["scene", "tree"] as const;
type Tab = typeof Tabs[number];

const FileInfo = () => {
  const { files, loadingFiles } = useFiles();
  const threeExports = useAtomValue(threeExportsAtom);
  if (!threeExports) {
    return null;
  }

  const { scene } = threeExports;
  const totals = groupInfo(scene);

  return <div style={{
    width: "100%",
    height: "100%",
    overflow: "auto",
    padding: 8,
  }}>
    <section>
      <strong>Files</strong> <span style={{ color: "gray" }}>{files.length}개</span>
      <ul style={{ paddingLeft: 4 }}>
        {files.map(({ file, name, start, end }, index) => {
          return <li key={`파일로드-${index}-${name}`} style={{ marginTop: 6, fontSize: 14 }}>
            <div>{name}({Math.round(file.size / (1024 * 1024))}mb){end === 0 ? " : loading..." : ` : ${formatNumber(end - start)}ms`}</div>
          </li>
        })}
      </ul>
    </section>
    <section style={{ marginTop: 16 }}>
      <strong>Scene</strong>
      <div style={{ paddingLeft: 4 }}>
        총 메쉬 : {formatNumber(totals.meshCount)}개
      </div>
      <div style={{ paddingLeft: 4 }}>
        총 삼각형 : {formatNumber(totals.triangleCount)}개
      </div>
      <div style={{ paddingLeft: 4 }}>
        총 버텍스 : {formatNumber(totals.vertexCount)}개
      </div>

      <ul style={{ paddingLeft: 4, marginTop: 8 }}>
        {scene.children.map((child, index) => {
          return <li key={"info-" + child.uuid} style={{ fontSize: 14 }}>
            {/* <div>{child.uuid}</div> */}
            <div style={{ fontSize: 15, fontWeight: "bold" }}>{child.name}</div>
            <div style={{ paddingLeft: 8 }}>
              메쉬 : {formatNumber(groupInfo(child).meshCount)}개
            </div>
            <div style={{ paddingLeft: 8 }}>
              삼각형 : {formatNumber(groupInfo(child).triangleCount)}개
            </div>
            <div style={{ paddingLeft: 8 }}>
              버텍스 : {formatNumber(groupInfo(child).vertexCount)}개
            </div>
          </li>
        })}
      </ul>
    </section>
  </div>
}

const ThePanel = () => {
  const loadHistory = useAtomValue(loadHistoryAtom);
  const [tab, setTab] = useState<Tab>(
    "scene"
  );

  return <div style={{
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
  }}>
    <div style={{
      height: 30,
      // display: "flex",
      // justifyContent: "space-between",
      // alignItems: "center",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))", /* Equal width for each element */
      width:"100%",
    }}>
      {Tabs.map((t) => {
        return <button style={{ height: "100%", textTransform: "capitalize" }} key={t} onClick={() => setTab(t)}>{t}</button>
      })}
    </div>
    <div style={{
      flex: 1,
      minHeight: 0,
    }}>
      {
        tab === "scene" ? <FileInfo /> : null
      }
    </div>
  </div>
}

function Renderer() {
  const threeExports = useThree();
  const sources = useAtomValue(sourceAtom);
  const setLoadHistoryAtom = useSetAtom(loadHistoryAtom);
  const setThreeExportsAtom = useSetAtom(threeExportsAtom);
  const { scene } = threeExports;

  useEffect(() => {
    setThreeExportsAtom(threeExports);
  }, []);

  useEffect(() => {

    sources.forEach(source => {
      const { name, url, file } = source;
      // setLoadingsAtom(loadings => [...loadings, source]);
      setLoadHistoryAtom(history => {
        const newHistory = new Map(history);
        //@ts-ignore
        newHistory.set(url, { name, start: Date.now(), end: 0, file, uuid: null });
        return newHistory;
      })

      new VGLTFLoader().loadAsync(url).then(gltf => {
        gltf.scene.name = name + "-" + gltf.scene.name;
        scene.add(gltf.scene);
        // revoke object url
        URL.revokeObjectURL(url);
        setLoadHistoryAtom(history => {
          const newHistory = new Map(history);
          newHistory.get(url)!.end = Date.now();
          newHistory.get(url)!.uuid = gltf.scene.uuid;
          return newHistory;
        })
      })
    })
  }, [sources]);

  return <>
    {/* <ambientLight />
    <pointLight position={[10, 10, 10]} />
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh> */}
    <OrbitControls />
  </>
}

function RendererContainer() {


  return (
    <div style={{
      width: "100%",
      height: "100%",
    }}>
      <Canvas
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <Renderer></Renderer>
      </Canvas>
    </div>
  )
}

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

      const acceptedExtensions = ['.gltf', '.glb'];
      const files = Array.from(event.dataTransfer.files);

      // Filter files by .gltf and .glb extensions
      const filteredFiles = files.filter((file) =>
        acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
      );

      if (filteredFiles.length === 0) {
        alert("Only .gltf and .glb files are accepted.");
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

function Loading() {
  // const loadings = useAtomValue(loadingsAtom);
  // const loadingHistory = useAtomValue(loadHistoryAtom);
  const files = useFiles();
  const { loadingFiles } = files;
  const hasLoading = loadingFiles.length > 0;

  return <>
    {hasLoading && <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        padding: 16,
        borderRadius: 8,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: "bold",
        }}>
          Loading {loadingFiles.length} files...
        </div>
        <div style={{
          marginTop: 16,
        }}>
          {loadingFiles.map(({ name }, index) => (
            <div key={index}>{name}</div>
          ))}
        </div>
      </div>



    </div>}
  </>
}

const ControlPanel = () => {
  const threeExports = useAtomValue(threeExportsAtom);
  const setLoadHistoryAtom = useSetAtom(loadHistoryAtom);

  if (!threeExports) {
    return null;
  }

  return null;

  return <div
    style={{ position: "absolute", top: 8, left: 8, padding: 4, borderRadius: 4, backgroundColor: "rgba(0, 0, 0, 0.1)" }}>
    <button onClick={() => {
      //@ts-ignore
      threeExports.scene.children.forEach(child => {
        //@ts-ignore
        threeExports.scene.remove(child);
      })

      setLoadHistoryAtom(new Map());
    }}>Reset</button>
  </div>
}

function App() {
  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useDragAndDrop();

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      cursor: isDragging ? "copy" : "auto",
      position: "relative",
      display: "flex",
    }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div style={{
        flex: 1,
        minWidth: 0,
        height: "100%",

      }}>
        <RendererContainer />
      </div>
      <div style={{
        width: "25%",
        minWidth: "240px",
        height: "100%",
      }}>

        <ThePanel />
      </div>
      <ControlPanel></ControlPanel>
      <Loading />
    </div>
  )
}

export default App
