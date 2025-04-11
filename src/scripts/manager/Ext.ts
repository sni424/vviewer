// File도 name이 있으므로 가능
interface NameContainer {
  name: string;
}

// 확장자 비교
export default class Ext {
  ext: string;
  constructor(url: string);
  constructor(file: NameContainer);
  constructor(param: string | NameContainer) {
    if (typeof param === 'string') {
      this.ext = param.toLowerCase().split('.').pop()!;
    } else {
      this.ext = param.name.toLowerCase().split('.').pop()!;
    }

    if (!this.ext) {
      debugger;
      throw new Error('확장자 없음');
    }

    throw new Error('Invalid parameter');
  }
  same(ext: Ext): boolean;
  same(url: string): boolean;
  same(file: NameContainer): boolean;
  same(param?: string | NameContainer | Ext): boolean {
    if (!param) {
      return false;
    }

    if (param instanceof Ext) {
      return this.ext === param.ext;
    } else {
      return this.same(new Ext(param as any));
    }
  }
}
