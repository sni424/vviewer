// File도 name이 있으므로 가능
interface NameContainer {
  name: string;
}

// 확장자 비교
export default class Ext {
  ext: string;
  constructor(ext: Ext);
  constructor(url: string);
  constructor(file: NameContainer);
  constructor(param: Ext | string | NameContainer) {
    if (typeof param === 'string') {
      this.ext = param.toLowerCase().split('.').pop()!;
      return;
    } else if (param instanceof Ext) {
      this.ext = param.ext;
    } else {
      this.ext = param.name.toLowerCase().split('.').pop()!;
    }

    if (!this.ext) {
      debugger;
      throw new Error('확장자 없음');
    }
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

  static same(
    ext1?: Ext | string | NameContainer,
    ext2?: Ext | string | NameContainer,
  ): boolean {
    if (
      typeof ext1 === 'undefined' ||
      typeof ext2 === 'undefined' ||
      ext1 === null ||
      ext2 === null
    ) {
      return false;
    }
    return new Ext(ext1 as any).same(new Ext(ext2 as any));
  }
}
