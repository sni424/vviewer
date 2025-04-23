export default class EventHandler<T extends Record<string, any>> {
  private _events: { [K in keyof T]?: Array<(data: T[K]) => void> } = {};

  on = this.add;
  add<K extends keyof T>(eventName: K, callback: (data: T[K]) => void): void {
    if (!this._events[eventName]) {
      this._events[eventName] = [];
    }
    this._events[eventName]!.push(callback);
  }

  remove<K extends keyof T>(
    eventName: K,
    callback: (data: T[K]) => void,
  ): void {
    if (!this._events[eventName]) return;
    this._events[eventName] = this._events[eventName]!.filter(
      cb => cb !== callback,
    ) as Array<(data: T[K]) => void>;
  }

  change = this.emit;
  emit<K extends keyof T>(eventName: K, data: T[K]): void {
    if (!this._events[eventName]) return;
    this._events[eventName]!.forEach(callback => callback(data));
  }
}
