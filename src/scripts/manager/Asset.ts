import AssetMgr from './AssetMgr';
import { iterateWithPredicate } from './assets/AssetUtils';
import Hasher from './assets/Hasher';
import { CachePayload } from './assets/VCache';
import { isVRemoteFile, VFile, VRemoteFile } from './assets/VFile';

export default class Asset {
  id: string;
  inputSource: any;

  get vfile(): VFile {
    return AssetMgr.cache.get(this.id)?.payload?.vfile!;
  }

  get vremotefile(): VRemoteFile {
    return AssetMgr.cache.get(this.id)?.payload?.vremotefile!;
  }
  get file(): File {
    return AssetMgr.cache.get(this.id)?.payload?.file!;
  }
  get inputBuffer(): ArrayBuffer {
    return AssetMgr.cache.get(this.id)?.payload?.inputBuffer!;
  }
  get result(): any {
    return AssetMgr.cache.get(this.id)?.payload?.result!;
  }
  get payload(): Partial<CachePayload<any>> {
    return AssetMgr.cache.get(this.id)?.payload!;
  }

  // 재귀적으로 vfile을 채운 내용
  async vfileInflated(): Promise<VFile | undefined> {
    if (!this.vfile) {
      return undefined;
    }

    const vfile = structuredClone(this.vfile);

    iterateWithPredicate<VRemoteFile>(
      vfile,
      isVRemoteFile,
      async (value, path) => {
        if (value.format !== 'json') {
          return;
        }

        const asset = await Asset.fromVRemoteFile(value).prepare();
        const toChange = await asset.vfileInflated()!;

        const target = path.reduce((acc, key) => (acc as any)[key], vfile);
        Object.assign(target, toChange);
      },
    );

    return vfile;
  }

  // VFile인 경우 VFile 내부에 VRemoteFile이 있는 경우
  // traverse(cb: (asset: Asset) => void, dictionary?: Map<string, Asset>) {
  //   dictionary = dictionary ?? new Map<string, Asset>();

  //   if (!this.vfile) {
  //     return;
  //   }

  //   const vfile = this.vfile;
  //   iterateWithPredicate(vfile, file=>(
  //     return isVFile(file)
  //   ))
  // }

  // 다음을 기다림
  // 1. File인풋인 경우 File.arrayBuffer()
  // 2. VFile 또는 VRemoteFile인 경우 재귀적으로 VFile을 다운로드
  async prepare(): Promise<this> {
    await AssetMgr.cache.getAsync<any>(this.id);
    return this;
  }

  // AssetMgr 내부에서 알아서 로드
  // 1. File인 경우 glb, 텍스쳐, 제이슨
  // 2. VRemoteFile인 경우 VFile 다운로드 후 3번으로
  // 3. VFile인 경우 경우에 따라 Three객체, 또는 일반 Object
  async load<T>(): Promise<T> {
    return AssetMgr.load(this);
  }

  protected constructor(id: string, inputSource?: any, autoPrepare?: boolean) {
    this.id = id;

    if (inputSource) {
      this.inputSource = inputSource;
      AssetMgr.set(id, inputSource, autoPrepare);
    }
  }

  static fromVRemoteFile(vremotefile: VRemoteFile) {
    return new Asset(vremotefile.id, vremotefile);
  }

  static fromVFile(vfile: VFile, autoPrepare = false) {
    return new Asset(vfile.id, vfile, autoPrepare);
  }

  /**
   *
   * @param file 로컬 파일
   * @param autoPrepare true인 경우 File.arrayBuffer()
   * @returns
   */
  static fromFile(file: File, autoPrepare = true) {
    const id = Hasher.hash(file);
    return new Asset(id, file, autoPrepare);
  }

  static fromBuffer(buffer: ArrayBuffer) {
    const id: string = AssetMgr.cache.get(buffer)?.id ?? Hasher.hash(buffer);
    return new Asset(id, buffer);
  }

  static fromId(id: string) {
    if (!AssetMgr.cache.has(id)) {
      AssetMgr.createEmpty(id);
    }
    return new Asset(id);
  }

  static from<T = any>(id: string, value: Partial<CachePayload<T>>) {
    const { file, inputBuffer, result, vfile, vremotefile } = value;

    if (file) {
      return Asset.fromFile(file);
    }

    if (vfile) {
      return Asset.fromVFile(vfile);
    }

    if (vremotefile) {
      return Asset.fromVRemoteFile(vremotefile);
    }

    if (inputBuffer) {
      return Asset.fromBuffer(inputBuffer);
    }

    if (result) {
      return new Asset(id, result);
    }
  }

  get fileName(): string | undefined {
    return AssetMgr.cache.getFile(this.id)?.name;
  }

  get isGlb(): boolean {
    return this.fileName?.toLowerCase()?.endsWith('.glb') ?? false;
  }

  static _maps = ['jpg', 'jpeg', 'png', 'exr', 'ktx', 'ktx2', 'hdr'];
  get isMap(): boolean {
    const mapname = this.fileName?.toLowerCase();

    return Asset._maps.includes(mapname as string);
  }
}
