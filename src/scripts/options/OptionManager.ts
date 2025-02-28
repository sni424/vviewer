export default class OptionManager {
  static instance: OptionManager;

  constructor() {
    OptionManager.instance = this;
  }
}
