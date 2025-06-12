export default class FileFetcherQueue {
  private static taskMap = new Map<string, Promise<File>>();
  private static fileMap = new Map<string, File>();
  private static filesIn: string[] = [];

  static async fetchFile(filename: string, fetchFn: () => Promise<File>): Promise<File> {
    this.filesIn.push(filename);

    if (this.fileMap.has(filename)) {
      console.log(`file Already Loaded ${filename}`);
      return this.fileMap.get(filename) as File;
    }

    if (this.taskMap.has(filename)) {
      return this.taskMap.get(filename)!;
    }

    const task = fetchFn().then(file => {
      this.fileMap.set(filename, file);
      return file;
    }).finally(() => {
      this.taskMap.delete(filename); // 성공/실패 후 캐시 제거
    });

    this.taskMap.set(filename, task);
    return task;
  }

  static getFilesCount() {
    return this.filesIn.length;
  }
}