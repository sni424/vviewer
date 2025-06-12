import { THREE } from "VTHREE";
import { AssetMgr } from "./AssetMgr";
import { EXRLoader } from "three/examples/jsm/Addons.js";
import { fetchArrayBuffer } from "src/scripts/atomUtils";
import { extend } from '@react-three/fiber';

const VFileCache = new Map<string, any>();

const hash = (obj: any) => {
  return '';
};

type FileID = {
  type:"vfile" | 'raw';
  id:string; // === url
};
type FileURL = string;

// URL
type RawFile = ArrayBuffer;
'/files/2409vj0zsrmvow4v';

type VTexture = {
  id:string;
  type: 'texture';
  object: {
    type:'DataTexture' | 'Texture' | 'CompressedTexture';
    channel:number;
    flipY:boolean;
    img: FileID;
  }
}

// AssetMgr.getRawFile(id)

// if('DataTexture'){
//   const loader =new EXRLoader();
//   loader.parse = (data: ArrayBuffer) => {}
// }

type VMaterial = {
  id:string;
  type: 'material';
  object: {
    tex1: FileID
    tex2: FileID
  }
}

const _id :FileID = '123';
const VFILE = fetch(_id).then(res=>res.json());


const ab = fetchArrayBuffer(_id);
function deserialize <T>(ab: ArrayBuffer):T{
  return {} as T;
}
const vfile = deserialize<VFile>(ab);

type CacheValueType<T> = {
  state : 'loading';
  data: Promise<T>;
} | {
  state : 'loaded';
  data: T;
}

const fileCache = new Map<FileID, {
  rawFile:CacheValueType<RawFile>;
  vfile:CacheValueType<VFile>,
  object?:
    CacheValueType<THREE.Object3D> |
    CacheValueType<THREE.Texture> |
    CacheValueType<Record<string, any>>;
}>();

type VFile = {
  id:string;
  type: 'material' | 'texture' | 'geometry' | 'object3d' | 'scene';
  object: {
    material:FileID;
    geometry:FileID;
  }
};

type VObject = {
  type: string;
};

// VObjectA 타입 정의
type VObjectA = {
  type: 'A';
};

// Wrapper 인터페이스 정의
interface Wrapper<T extends VObject> {
  type: T['type'];
}

function convert<T>(f: VFile | FileID):T{
  if(f.type === 'texture'){

    return {} as T;
  }

  return {} as T;
}

// convert<THREE.Texture>();

// get이 처리해야하는 타입
type Gettable = VFile


class AssetMgr {
  static get(f: RemoteAsset) {
    const cached = VFileCache.get(hash(f));

    if (cached) {
      return cached;
    } else {
      // prep
      const fetched = fetch(f);

      // case 1 : fetched = json
      {

      }

      // case 2 : fetched = ArrayBuffer
      {


      }
    }
  }
}

// steps
  const Steps: 'prep' | 'loadable' | 'loading' | 'loaded' = 'prep';

  type RemoteAsset = {};
  class Asset {
  /**
   *
   */
  private constructor(f: File | RemoteAsset) {}

  static create(f: File | RemoteAsset) {
    const cached = VFileCache.get(hash(f));

    if (cached) {
      return cached;
    } else {
      // prep
      if(f instanceof File){
        f.arrayBuffer() // prep;
      } else {
        AssetMgr.get(f as RemoteAsset) // prep;
      }
    }
  }

  async load<T>(): Promise<T> {
    return {} as T;
  }
}
