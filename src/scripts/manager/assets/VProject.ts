import { VLoadable } from './VFile';
import { VOption } from './VOption';
import { VScene } from './VScene';

export interface VProject {
  option: {
    defaultOption: VLoadable<VOption>;
    options: VLoadable<VOption>[]; // -> VFile -> VOption
  };
  rootScenes: VLoadable<VScene>[]; // -> VFile -> VScene

  files: VLoadable[]; // 현재 프로젝트에서 사용할 수 있는 파일리스트, 로드해서 VFile[]로 변환
}
