import { Effects, MeshEffect } from '../ModelOptionObject.ts';
import * as THREE from '../VTHREE.ts';
import OptionState from './OptionState.ts';

export default class OptionStateMesh {
  private readonly _targetMesh: THREE.Mesh;
  private _expanded: boolean = true;
  private _optionEffect: Effects = {
    useVisible: false,
    useLightMap: false,
    visibleValue: false,
    lmValue: null,
  };
  private readonly _parent: OptionState;

  constructor(parent: OptionState, targetMesh: THREE.Mesh) {
    this._parent = parent;
    this._targetMesh = targetMesh;
  }

  get parent(): OptionState {
    return this._parent;
  }

  get mesh() {
    return this._targetMesh;
  }

  get name() {
    return this._targetMesh.name;
  }

  get useVisible() {
    return this._optionEffect.useVisible;
  }

  set useVisible(value: boolean) {
    this._optionEffect.useVisible = value;
  }

  get useLightMap() {
    return this._optionEffect.useLightMap;
  }

  set useLightMap(value: boolean) {
    this._optionEffect.useLightMap = value;
  }

  get visibleValue() {
    return this._optionEffect.visibleValue;
  }

  set visibleValue(value: boolean) {
    this._optionEffect.visibleValue = value;
  }

  get lmValue(): string | null {
    return this._optionEffect.lmValue;
  }

  set lmValue(value: string) {
    this._optionEffect.lmValue = value;
  }

  get expanded(): boolean {
    return this._expanded;
  }

  set expanded(value: boolean) {
    this._expanded = value;
  }

  get effect(): Effects {
    return this._optionEffect;
  }

  set effect(value: Effects) {
    this._optionEffect = value;
  }

  copy() {
    const newState = new OptionStateMesh(this.parent, this.mesh);
    newState.effect = this.effect;
    return newState;
  }

  toJSON(): MeshEffect {
    return {
      targetMeshProperties: {
        uuid: this.mesh.uuid,
        name: this.name,
      },
      effects: this.effect,
      expanded: this.expanded,
    };
  }
}
