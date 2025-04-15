import { FileID, VAssetType } from './AssetTypes';
import Loadable from './Loadable';
// import VFile from './VFile';
import VOption from './VOption';
import VScene from './VScene';

type CommonObject = Record<string, any>;

interface VProjectData {
  option: {
    defaultOption: VOption;
    options: VOption[]; // -> VFile -> VOption
  };
  rootScenes: VScene[]; // -> VFile -> VScene

  files: VFile[]; // 현재 프로젝트에서 사용할 수 있는 파일리스트, 로드해서 VFile[]로 변환
}

export default class VProject extends Loadable<VProjectData> {
  type = 'VProject' as VAssetType;
  parse(): Promise<VProjectData> {
    this.loadables!.rootScenes[0];
    return Promise.resolve({
      option: {
        defaultOption: new VOption({
          id: 'default',
          scene: new VScene({
            id: 'default',
          }),
        }),
        options: [],
      },
      rootScenes: [],
      files: [],
    });
  }
}

// json객체
type VFile<AssetType extends VAssetType, T extends Record<any, any> = any> = {
  id: FileID; // json url : workspace/project/files/[id] <- json파일
  type: AssetType;
  object: T; // json객체
  references: Record<FileID, VFile<any>>; // 이 파일을 로드하기 위해 필요한 VFile들. ex) Material 하위의 Texture
  rawFiles: Record<FileID, URL>; // RawFile URL, geometry의 경우 여러 개 필요해서 배열
} & {
  // 업로드 시 제외, json로드 시 자동으로 할당
  isVFile: true; // always true,
  state: 'loadable' | 'loading' | 'loaded';
};

export interface VTexture
  extends VFile<
    'VTexture',
    {
      flipY?: boolean;
      wrapS?: boolean;
      wrapT?: boolean;
      magFilter?: number;
      minFilter?: number;
      anisotropy?: number;
      format?: number;
    }
  > {}

// export interface VMaterial
//   extends VFile<
//     'VMaterial',
//     {
//       textures: VTexture[];
//     }
//   > {}

export interface VBufferGeometry
  extends VFile<
    'VBufferGeometry',
    {
      name?: string;
      userData: CommonObject;
    }
  > {}

export interface VObject3D
  extends VFile<
    'VObject3D',
    {
      materials: VFile<'VMaterial'>[];
      geometries: VFile<'VBufferGeometry'>[];
    }
  > {}
