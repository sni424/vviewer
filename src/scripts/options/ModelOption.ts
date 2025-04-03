import { v4 } from 'uuid';
import * as THREE from 'VTHREE';
import { Effects, ModelOptionObject } from '../ModelOptionObject.ts';
import OptionState, { FunctionEffects } from './OptionState.ts';

class ModelOption {
  private _id: string = v4();
  private _states: OptionState[] = [];
  private _name: string = 'New Option';
  private _expanded: boolean = true;
  private _defaultSelected: string | null = null;

  constructor() {
    window.addEventListener('scene-added', () => {
      this.reload();
    });
  }

  get id() {
    return this._id;
  }

  get states() {
    return this._states;
  }

  set states(states: OptionState[]) {
    this._states = states;
  }

  getStateById(id: string) {
    return this._states.find(state => state.id === id);
  }

  addState(state: OptionState) {
    if (!this._states.some(s => s.id === state.id)) {
      this._states.push(state);
    }
  }

  addStates(states: OptionState[]) {
    const newStates = states.filter(
      state => !this._states.some(s => s.id === state.id),
    );
    this._states.push(...newStates);
  }

  updateState(state: OptionState) {
    const idx = this._states.findIndex(s => s.id === state.id);
    if (idx !== -1) {
      this._states[idx] = state;
    } else {
      console.warn('No state with id : ' + state.id);
    }
  }

  removeState(state: OptionState) {
    this._states = this._states.filter(s => s.id !== state.id);
  }

  resetState() {
    this._states = [];
  }

  get name() {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get expanded() {
    return this._expanded;
  }

  set expanded(expanded: boolean) {
    this._expanded = expanded;
  }

  get defaultSelected() {
    return this._defaultSelected;
  }

  set defaultSelected(selected: string) {
    this._defaultSelected = selected;
  }

  arrangeEffects() {
    return this._states.reduce(
      (acc, state) => {
        acc[state.id] = state.arrangeEffects();
        return acc;
      },
      {} as {
        [key: string]: {
          meshEffects: {
            [key: string]: {
              mesh: THREE.Mesh;
              effects: Effects;
            };
          };
          functionEffects: FunctionEffects;
        };
      },
    );
  }

  copy() {
    const newOption = new ModelOption();
    newOption._states = this._states.map(state => state.copy());
    return newOption;
  }

  toJSON(): ModelOptionObject {
    return {
      id: this.id,
      states: this._states.map(state => state.toJSON()),
      name: this._name,
      expanded: this._expanded,
      defaultSelected: this._states[0].id,
    };
  }

  fromJSON(json: ModelOptionObject) {
    this._id = json.id;
    this._name = json.name;
    this._states = json.states.map(state =>
      new OptionState(this).fromJSON(state),
    );
    this._expanded = json.expanded;
    this._defaultSelected = json.defaultSelected ?? this._states[0].id;
    return this;
  }

  reload() {
    console.log('reloading');
    // Scene에 메시 로드 전에 클래스 생성 시 안될 수 있음
    this._states.forEach(state => state.reload());
  }
}

export default ModelOption;
