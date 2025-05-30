import * as THREE from 'VTHREE';
import { Effects, MeshEffectJSON } from '../ModelOptionObject.ts';
import ModelOption from './ModelOption.ts';
import OptionState from './OptionState.ts';

export default class MeshEffect {
  private readonly _targetMeshProperties: { name: string; uuid: string };
  private _targetMesh: THREE.Mesh | null = null;
  private _expanded: boolean = true;
  private _optionEffect: Effects = {
    useVisible: false,
    useLightMap: false,
    visibleValue: false,
    lmValue: null,
    lightMapValues: {},
  };
  private readonly _parent: OptionState;

  constructor(
    parent: OptionState,
    targetMeshInfo: { name: string; uuid: string },
    targetMesh?: THREE.Mesh | null,
  ) {
    this._parent = parent;
    this._targetMeshProperties = targetMeshInfo;
    if (targetMesh) {
      this._targetMesh = targetMesh;
    }
    this._optionEffect.lightMapValues = {};
  }

  get meshProperty() {
    return this._targetMeshProperties;
  }

  get parent(): OptionState {
    return this._parent;
  }

  get grandParent(): ModelOption {
    return this._parent.parent;
  }

  get mesh(): THREE.Mesh | null {
    if (this._targetMesh) {
      return this._targetMesh;
    } else {
      return null;
    }
  }

  set mesh(mesh: THREE.Mesh) {
    this._targetMesh = mesh;
  }

  get name() {
    if (this._targetMesh) {
      return this._targetMesh.name;
    } else {
      return this.meshProperty.name;
    }
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

  set lmValue(value: string | null) {
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

  get lightMapValues() {
    return this._optionEffect.lightMapValues!!;
  }

  setLightMapValues(targetState: OptionState, url: string) {
    const lightMapValues = this._optionEffect.lightMapValues;
    if (!lightMapValues) {
      this._optionEffect.lightMapValues = {};
    }

    if (!lightMapValues) {
      // Temp Error Handle for Type
      throw new Error('Can not set lightMapValues for this feature');
    }

    if (Object.keys(lightMapValues).includes(targetState.parent.id)) {
      lightMapValues[targetState.parent.id] = {
        ...lightMapValues[targetState.parent.id],
        [targetState.id]: url,
      };
    } else {
      lightMapValues[targetState.parent.id] = { [targetState.id]: url };
    }
  }

  copy(newParent?: OptionState) {
    const newState = new MeshEffect(
      newParent ?? this.parent,
      this._targetMeshProperties,
      this.mesh,
    );
    newState.effect = { ...this.effect };
    return newState;
  }

  toJSON(): MeshEffectJSON {
    return {
      targetMeshProperties: this._targetMeshProperties,
      effects: this.effect,
      expanded: this.expanded,
    };
  }

  fromJSON(effect: MeshEffectJSON) {
    this.effect = effect.effects;
    this.expanded = effect.expanded;
    return this;
  }
}
