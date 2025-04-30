import { MaxFile, MaxFileData, MaxFileType } from 'src/pages/max/maxAtoms.ts';

const MaxCache = {
  enabled: true,

  files: new Map<{ name: string; type: MaxFileType }, MaxFileData>(),

  add: function (maxFile: MaxFile) {
    if (!this.enabled) return;

    const { resultData } = maxFile;

    this.files.set(getKeyFromMaxFile(maxFile), resultData);
  },

  has: function (maxFile: MaxFile): boolean {
    if (!this.enabled) return false;

    return this.files.has(getKeyFromMaxFile(maxFile));
  },

  get: function (maxFile: MaxFile): MaxFileData | null {
    if (!this.enabled) return null;

    if (!this.has(maxFile)) return null;
    else return this.files.get(getKeyFromMaxFile(maxFile)) as MaxFileData;
  },

  remove: function (maxFile: MaxFile): void {
    this.files.delete(getKeyFromMaxFile(maxFile));
  },

  clear: function (): void {
    this.files = new Map();
  },

  size: function (): number {
    return this.files.size;
  },
};

function getKeyFromMaxFile(maxFile: MaxFile) {
  const { originalFile, type } = maxFile;

  // console.log( 'THREE.Cache', 'Adding key:', key );
  const name = originalFile.name;

  return { name, type };
}

export { MaxCache };
