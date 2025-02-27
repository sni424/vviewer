import { v4 } from 'uuid';
import { Effects, ModelOptionState } from '../ModelOptionObject.ts';
import * as THREE from '../VTHREE.ts';
import ModelOption from './ModelOption.ts';
import OptionStateMesh from './OptionStateMesh.ts';

export default class OptionState {
  private _id: string = v4();
  private _name: string;
  private _effects: OptionStateMesh[] = [];
  private _expanded: boolean = true;
  private _parent: ModelOption;

  constructor(parent: ModelOption, name: string = 'New State') {
    this._parent = parent;
    this._name = name;
  }

  get parent() {
    return this._parent;
  }

  get id() {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get expanded(): boolean {
    return this._expanded;
  }

  set expanded(value: boolean) {
    this._expanded = value;
  }

  get effects(): OptionStateMesh[] {
    return this._effects;
  }

  set effects(value: OptionStateMesh[]) {
    this._effects = value;
  }

  // Main Logics

  private getIndex(target: string | THREE.Mesh): number {
    const name = typeof target === 'string' ? target : target.name;
    return this._effects.findIndex(eff => eff.name === name);
  }

  removeMesh(target: string | THREE.Mesh) {
    const idx = this.getIndex(target);
    if (idx > -1) {
      this._effects.splice(idx, 1);
    }
  }

  isMeshRelatedWithOption(mesh: THREE.Mesh): boolean {
    return this.getIndex(mesh) !== -1;
  }

  arrangeEffects() {
    const e = this._effects;
    const result: { [key: string]: { mesh: THREE.Mesh; effects: Effects } } =
      {};
    e.forEach(effect => {
      const mesh = effect.mesh;
      const effects = effect.effect;

      result[mesh.name] = { mesh, effects };
    });

    return result;
  }

  copy() {
    const state = new OptionState(this.parent);
    state.effects = this.effects.map(effect => effect.copy());
    return state;
  }

  toJSON(): ModelOptionState {
    const effectsToJSON = this.effects.map(effect => effect.toJSON());

    return {
      id: this.id,
      stateName: this.name,
      expanded: this.expanded,
      meshEffects: effectsToJSON,
    };
  }

  fromJSON(state: ModelOptionState) {
    this._id = state.id;
    this.name = state.stateName;
    this.expanded = state.expanded;
    // this.effects = state.meshEffects.map(effect => new OptionStateMesh(this, ))
    return this;
  }
}
