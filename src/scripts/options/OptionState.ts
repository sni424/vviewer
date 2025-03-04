import { v4 } from 'uuid';
import { threes } from '../atomUtils.ts';
import { Effects, ModelOptionState } from '../ModelOptionObject.ts';
import * as THREE from '../VTHREE.ts';
import ModelOption from './ModelOption.ts';
import OptionStateMesh from './OptionStateMesh.ts';

export default class OptionState {
  private _id: string = v4();
  private _name: string;
  private _effects: OptionStateMesh[] = [];
  private _expanded: boolean = true;
  private readonly _parent: ModelOption;

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
      if (mesh) {
        const effects = effect.effect;

        result[mesh.name] = { mesh, effects };
      }
    });

    return result;
  }

  copy() {
    const state = new OptionState(this.parent);
    state.effects = this.effects.map(effect => effect.copy(state));
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
    const three = threes();
    if (!three) {
      console.warn('아직 THREE 객체가 초기화 되지 않았음');
    }
    this._id = state.id;
    this.name = state.stateName;
    this.expanded = state.expanded;
    this.effects = state.meshEffects.map(effect => {
      let mesh: THREE.Mesh | null = null;

      if (three) {
        const { scene } = three;
        const object = scene
          .getObjectsByProperty('name', effect.targetMeshProperties.name)
          .find(m => m.type === 'Mesh');
        mesh = object as THREE.Mesh;
      }
      return new OptionStateMesh(
        this,
        effect.targetMeshProperties,
        mesh,
      ).fromJSON(effect);
    });
    return this;
  }

  reload() {
    const three = threes();

    if (!three) {
      console.error(
        'OptionState.reload() : 아직 Three.js 객체가 로드되지 않음',
      );
      return;
    }

    const { scene } = three;
    const effects = this.effects;

    const noMeshEffects = effects.filter(effect => {
      return effect.mesh === null;
    });

    const effectsToLoad = noMeshEffects.length;
    let loadedEffects = 0;
    const notLoadedMeshes: string[] = [];
    if (effectsToLoad === 0) {
      console.log(`OptionState.reload() - ${this._id} : 로드할 Effect 없음`);
      return;
    }

    console.log(
      `OptionState.reload() - ${this._id} -> 로드할 effect 갯수 : `,
      effectsToLoad,
    );

    noMeshEffects.forEach(effect => {
      const property = effect.meshProperty;
      const object = scene
        .getObjectsByProperty('name', property.name)
        .find(m => m.type === 'Mesh');
      if (object) {
        effect.mesh = object as THREE.Mesh;
        loadedEffects++;
      } else {
        notLoadedMeshes.push(property.name);
      }
    });

    console.log(
      `OptionState.reload() - ${this._id} : ${effectsToLoad} 개 중 ${loadedEffects}개 로드 됨`,
    );
    if (notLoadedMeshes.length > 0) {
      console.log(
        `OptionState.reload() - ${this._id} 로드 되지 않은 메시 목록`,
        notLoadedMeshes,
      );
    }
  }
}
