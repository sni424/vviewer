import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import ObjectViewer from 'src/components/ObjectViewer';
import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import Asset from 'src/scripts/manager/Asset';
import AssetMgr from 'src/scripts/manager/AssetMgr';
import { isDataArray } from 'src/scripts/manager/assets/AssetTypes';
import { THREE } from 'VTHREE';
import useTestModelDragAndDrop from './useTestModelDragAndDrop';

const mgr = AssetMgr;
const print = console.log;
interface UploadResponse {
  message: string;
  filePath: string;
  error?: string;
}

const getFilePath = (path: string) => `${AssetMgr.projectId}/${path}`;

// obj를 재귀적으로 돌면서 내부의 ArrayBuffer만 Uint8Array로 변환하는 함수
// ArrayBuffer을 mongodb에 저장하면 데이터가 날아가서 일단 Uint8Array로 변환
function convertArrayBufferToUint8Array(obj: any): any {
  // Handle null or non-object types (return unchanged)
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle ArrayBuffer
  if (obj instanceof ArrayBuffer) {
    return new Uint8Array(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertArrayBufferToUint8Array(item));
  }

  // Handle objects
  const result: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = convertArrayBufferToUint8Array(obj[key]);
    }
  }
  return result;
}

async function upload(
  filepath: string,
  data: object | ArrayBuffer | TypedArray,
  type?: 'json' | 'binary',
): Promise<UploadResponse> {
  filepath = getFilePath(filepath);

  const isArray = data instanceof ArrayBuffer || isTypedArray(data);
  type = type ?? (isArray ? 'binary' : 'json');

  const formData = new FormData();
  let file: File;

  if (type === 'json') {
    // Convert JSON object to a Blob
    const jsonString = JSON.stringify(convertArrayBufferToUint8Array(data));
    file = new File([jsonString], filepath, { type: 'application/json' });
  } else if (isDataArray(data)) {
    // Create a Blob from ArrayBuffer
    if (isTypedArray(data)) {
      file = new File([(data as TypedArray).buffer as ArrayBuffer], filepath, {
        type: 'application/octet-stream',
      });
    } else {
      // ArrayBuffer
      file = new File([data as ArrayBuffer], filepath, {
        type: 'application/octet-stream',
      });
    }
  } else {
    throw new Error('Invalid data type. Expected ArrayBuffer or TypedArray.');
  }

  formData.append('data', file);
  formData.append('filepath', filepath);
  formData.append('type', type);

  return fetch('http://localhost:4000/save', {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'multipart/form-data',
    },
  }).then(res => res.json() as Promise<UploadResponse>);
}

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export type Serializable =
  | null
  | undefined
  | boolean
  | number
  | string
  | ArrayBuffer
  | TypedArray
  | Serializable[]
  | { [key: string]: Serializable };

/**
 * Deeply compares two Serializable values for equality.
 * @param a First value to compare.
 * @param b Second value to compare.
 * @returns True if the values are deeply equal, false otherwise.
 */
function deepEqual(a: Serializable, b: Serializable): boolean {
  // Handle strict equality for primitives and reference equality
  if (a === b) {
    return true;
  }

  // Handle NaN (NaN === NaN is false, but they should be considered equal)
  if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
    return true;
  }

  // Type mismatch or one is null/undefined and the other isn't
  if (typeof a !== typeof b || a == null || b == null) {
    return false;
  }

  // Handle ArrayBuffer
  if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
    if (a.byteLength !== b.byteLength) {
      return false;
    }
    const viewA = new Uint8Array(a);
    const viewB = new Uint8Array(b);
    for (let i = 0; i < a.byteLength; i++) {
      if (viewA[i] !== viewB[i]) {
        return false;
      }
    }
    return true;
  }

  // Handle TypedArray
  if (isTypedArray(a) && isTypedArray(b)) {
    if (a.constructor !== b.constructor || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  // Handle Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Handle Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    return keysA.every(
      key => keysB.includes(key) && deepEqual((a as any)[key], (b as any)[key]),
    );
  }

  // Fallback for primitives that weren't caught by ===
  debugger;
  return false;
}

// Helper to check if a value is a TypedArray
function isTypedArray(value: any): value is TypedArray {
  return (
    value instanceof Int8Array ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Int16Array ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof BigInt64Array ||
    value instanceof BigUint64Array
  );
}

function CallLoader() {
  const { gl } = useThree();
  const ref = useRef(new VGLTFLoader(gl));

  return <></>;
}

function useEffectOnce(effect: () => void | (() => void)) {
  const calledRef = useRef(false);

  useEffect(() => {
    if (!calledRef.current) {
      calledRef.current = true;
      return effect();
    }
  }, []);
}

function TestPage() {
  const [useEnv, setUseEnv] = useState(true);
  const [loadedMat, setLoadedMat] = useState<THREE.Material>();
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const [asset, setAsset] = useState<Asset[]>([]);
  const { files, isDragging, handleDragOver, handleDragLeave, handleDrop } =
    useTestModelDragAndDrop();
  const [loaded, setLoaded] = useState<any[]>();

  // useEffectOnce(() => {
  //   new Asset(mesh2Asset).get();
  //   new Asset(meshAsset).get<THREE.Mesh>().then(mesh => {
  //     setAsset(mesh);
  //   });
  // });

  // print('rerender');

  useEffect(() => {
    if (files.length === 0) {
      return;
    }

    console.log('File changed', files);
    const assets = new Set(
      files.map(file => {
        console.log('Asset.from called');
        // const fileid = Hasher.hash(file);
        return Asset.fromFile(file);
      }),
    );
    print(assets);
    setAsset([...assets]);
    // print(assets.map(asset => asset.toJson()));
  }, [files]);

  return (
    <div
      className="fullscreen flex"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* <TestSceneChange /> */}
      <div className="flex-1">
        <div>
          <h3>Drag&Drop Assets</h3>
          <button
            onClick={async () => {
              const start = performance.now();
              Promise.all(
                asset.filter(a => a.isGlb).map(a => a.load<THREE.Group>()),
              ).then(groups => {
                const end = performance.now();
                console.log('glb 로드 완료', end - start, 'ms', groups);
                // groups.forEach(g => g.position.addScalar(2));
                const meshes = groups.map(g => g.flattendMeshes()).flat();
                sceneRef.current.add(...meshes);

                const startToasset = performance.now();
                sceneRef.current.toAsset().then(a => {
                  const endTooasset = performance.now();
                  console.log('toAsset', endTooasset - startToasset, 'ms', a);

                  const startInflate = performance.now();
                  a.vfileInflated().then(vfile => {
                    const endInflate = performance.now();
                    console.log('vfile inflated', vfile);
                    console.log(
                      'inflate',
                      endInflate - startInflate,
                      'ms',
                      vfile,
                    );
                  });
                });
              });
            }}
          >
            GLB만 로드
          </button>
          <button
            onClick={() => {
              setUseEnv(prev => !prev);
            }}
          >
            ENV : {useEnv ? 'OFF' : 'ON'}
          </button>
          <button
            onClick={() => {
              const urls = [
                // 'MAINBED _HG.glb',
                // 'MAINBED _M.glb',
                // 'MAINBED _M2.glb',
                // 'MAINBED..base.door.glb',
                // 'MAINBED..base.glb',
                // 'MAINBED..PT.glb',
                // 'option 라이브월 base E.glb',
                // 'option 라이브월 base.glb',
                // 'option 라이브월 base2.glb',
                // 'Pantry_base.glb',
                '주방base.001.glb',
                '주방base.002.glb',
                '주방base.M.glb',
                '주방DP METAL.glb',
                '주방DP METAL2.glb',
                '주방DP 냉장고수납장.glb',
              ];
              const loader = new VGLTFLoader();
              urls.forEach(url =>
                loader.load(url, gltf => {
                  console.log(gltf.scene);
                  sceneRef.current.add(gltf.scene);
                }),
              );
            }}
          >
            GLB쌩로드
          </button>
        </div>
        <ObjectViewer data={asset}></ObjectViewer>
      </div>
      <div className="flex-1 h-full">
        <Canvas
          scene={sceneRef.current}
          gl={{
            powerPreference: 'high-performance',
          }}
        >
          <CallLoader></CallLoader>
          <OrbitControls></OrbitControls>
          {useEnv && <Environment preset="apartment"></Environment>}
        </Canvas>
      </div>
    </div>
  );
}

export default TestPage;
