import Loadable from './Loadable';

interface VMaterialData {}

export default class VMaterial extends Loadable<VMaterialData> {
  parse() {
    return Promise.resolve({} as VMaterialData);
  }
}
