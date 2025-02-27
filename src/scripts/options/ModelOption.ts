import { v4 } from 'uuid';
import { ModelOptionObject } from '../ModelOptionObject.ts';
import OptionState from './OptionState.ts';

class ModelOption {
  private id: string = v4();
  private states: OptionState[] = [];
  private name: string = 'New Option';
  private expanded: boolean = true;

  constructor() {}

  getID() {
    return this.id;
  }

  getStates() {
    return this.states;
  }

  setStates(states: OptionState[]) {
    this.states = states;
  }

  addState(state: OptionState) {
    this.states.push(state);
  }

  addStates(states: OptionState[]) {
    this.states.push(...states);
  }

  removeState(state: OptionState) {
    const index = this.states.findIndex((v: OptionState) => v.id === state.id);
    if (index >= 0) {
      this.states.splice(index, 1);
    } else {
      console.warn('No state with id : ' + state.id);
    }
  }

  resetState() {
    this.states = [];
  }

  getName() {
    return this.name;
  }

  setName(name: string) {
    this.name = name;
  }

  isExpanded() {
    return this.expanded;
  }

  setExpanded(expanded: boolean) {
    this.expanded = expanded;
  }

  copy() {
    const newOption = new ModelOption();
    newOption.states = this.states.map(state => state.copy());
    return newOption;
  }

  toJSON(): ModelOptionObject {
    return {
      id: this.id,
      states: this.states.map(state => state.toJSON()),
      name: this.name,
      expanded: this.expanded,
    };
  }

  fromJSON(json: ModelOptionObject) {
    this.id = json.id;
    this.name = json.name;
    this.states = json.states.map(state =>
      new OptionState(this).fromJSON(state),
    );
    this.expanded = json.expanded;
    return this;
  }
}

export default ModelOption;
