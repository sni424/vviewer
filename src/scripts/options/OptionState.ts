import { Pathfinding } from 'three-pathfinding';
import { v4 } from 'uuid';
import * as THREE from 'VTHREE';
import { Walls } from '../../types.ts';
import { threes } from '../atomUtils.ts';
import { Effects, ModelOptionState } from '../ModelOptionObject.ts';
import MeshEffect from './MeshEffect.ts';
import ModelOption from './ModelOption.ts';

export type FunctionEffects = {
  booleans: FunctionEffectsBooleans;
  urls: FunctionEffectsURLs;
  // If Required -> Minimap is just URL
  objects?: {
    walls?: Walls;
    nav?: {
      pathfinding: Pathfinding;
      zoneId: string;
    };
    floor?: THREE.Mesh;
  };
};

export type FunctionEffectsBooleans = {
  changeMinimap: boolean;
  changeWall: boolean;
  changeNav: boolean;
  changeFloor: boolean;
  changeProbe: boolean;
}

export type FunctionEffectsURLs = {
  minimap: string; // URL
  walls: string;
  nav: string;
  floor: string;
  probe: {
    probeId: string;
    stateId: string;
    url: string;
  }[];
}

export type FunctionEffectsJSON = Omit<FunctionEffects, 'objects'>;

const DEFAULT_FUNCTION_EFFECTS = {
  booleans: {
    changeMinimap: false,
    changeWall: false,
    changeNav: false,
    changeFloor: false,
    changeProbe: false,
  },
  urls: {
    minimap: '', // URL
    walls: '',
    nav: '',
    floor: '',
    probe: [],
  }
};

export default class OptionState {
  private _id: string = v4();
  private _name: string;
  private _meshEffects: MeshEffect[] = [];
  functionEffects: FunctionEffects = DEFAULT_FUNCTION_EFFECTS;
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

  get meshEffects(): MeshEffect[] {
    return this._meshEffects;
  }

  set meshEffects(value: MeshEffect[]) {
    this._meshEffects = value;
  }

  // Main Logics

  private getIndex(target: string | THREE.Mesh): number {
    const name = typeof target === 'string' ? target : target.name;
    return this._meshEffects.findIndex(eff => eff.name === name);
  }

  removeMesh(target: string | THREE.Mesh) {
    const idx = this.getIndex(target);
    if (idx > -1) {
      this._meshEffects.splice(idx, 1);
    }
  }

  isMeshRelatedWithOption(mesh: THREE.Mesh): boolean {
    return this.getIndex(mesh) !== -1;
  }

  arrangeEffects() {
    const e = this._meshEffects;
    const result: { [key: string]: { mesh: THREE.Mesh; effects: Effects } } =
      {};
    e.forEach(effect => {
      const mesh = effect.mesh;
      if (mesh) {
        const effects = effect.effect;

        result[mesh.name] = { mesh, effects };
      }
    });

    return { meshEffects: result, functionEffects: this.functionEffects };
  }

  copy() {
    const state = new OptionState(this.parent);
    state.meshEffects = this.meshEffects.map(effect => effect.copy(state));
    return state;
  }

  toJSON(): ModelOptionState {
    const effectsToJSON = this.meshEffects.map(effect => effect.toJSON());
    const { booleans, urls }: FunctionEffects = this.functionEffects;

    return {
      id: this.id,
      stateName: this.name,
      expanded: this.expanded,
      meshEffects: effectsToJSON,
      functionEffects: { booleans, urls }
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
    this.meshEffects = state.meshEffects.map(effect => {
      let mesh: THREE.Mesh | null = null;

      if (three) {
        const { scene } = three;
        const object = scene
          .getObjectsByProperty('name', effect.targetMeshProperties.name)
          .find(m => m.type === 'Mesh');
        mesh = object as THREE.Mesh;
      }
      return new MeshEffect(this, effect.targetMeshProperties, mesh).fromJSON(
        effect,
      );
    });
    this.functionEffects = { ...this.functionEffects, ...state.functionEffects };
    // TODO Object create from json
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
    const effects = this.meshEffects;

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
