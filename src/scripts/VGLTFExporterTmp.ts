import { GLTFExporter, GLTFWriter } from 'three-stdlib';
import * as THREE from './vthree/VTHREE.ts';

interface MapDef {
  index: number;
  texCoord?: number;
  channel?: number;
  scale?: number;
  strength?: number;
}

interface MaterialDef {
  name: string;
  pbrMetallicRoughness: PartialPBRMetallicRoughnessDef;
  emissiveFactor: number;
  emissiveTexture: MapDef;
  normalTexture: MapDef;
  occlusionTexture: MapDef;
  alphaMode: 'BLEND' | 'MASK';
  alphaCutoff: number;
  doubleSided: boolean;
}

interface PBRMetallicRoughnessDef {
  baseColorFactor: number[];
  metallicFactor: number;
  roughnessFactor: number;
  metallicRoughnessTexture: MapDef;
  baseColorTexture: MapDef;
}

type PartialMaterialDef = Partial<MaterialDef>;
type PartialPBRMetallicRoughnessDef = Partial<PBRMetallicRoughnessDef>;

declare module 'three-stdlib' {
  interface GLTFWriter {
    cache: {
      meshes: Map<any, any>;
      attributes: Map<any, any>;
      attributesNormalized: Map<any, any>;
      materials: Map<any, any>;
      textures: Map<any, any>;
      images: Map<any, any>;
    };

    json: {
      asset: {
        version: string;
        generator: string;
      };
      materials: any[];
    };

    buildMetalRoughTexture(
      metalnessMap: THREE.Texture,
      roughnessMap: THREE.Texture,
    ): THREE.Texture;

    processTexture(texture: THREE.Texture): number;

    applyTextureTransform(mapDef: MapDef, texture: THREE.Texture): void;

    processMaterial(material: any): any;

    serializeUserData(
      material: THREE.Material,
      materialDef: PartialMaterialDef,
    ): void;

    _invokeAll(func: (ext: any) => void): void;
  }
}

GLTFWriter.prototype.processMaterial = function (material: any): any {
  console.log('Exporter Process material In');
  const cache = this.cache;
  const json = this.json;

  if (cache.materials.has(material)) return cache.materials.get(material);

  if (material.isShaderMaterial) {
    console.warn('GLTFExporter: THREE.ShaderMaterial not supported.');
    return null;
  }

  if (!json.materials) json.materials = [];

  // @QUESTION Should we avoid including any attribute that has the default value?
  const materialDef: PartialMaterialDef = {};

  materialDef.pbrMetallicRoughness = {};

  if (!material.isMeshStandardMaterial && !material.isMeshBasicMaterial) {
    console.warn(
      'GLTFExporter: Use MeshStandardMaterial or MeshBasicMaterial for best results.',
    );
  }

  // pbrMetallicRoughness.baseColorFactor
  const color = material.color.toArray().concat([material.opacity]);

  if (!equalArray(color, [1, 1, 1, 1])) {
    materialDef.pbrMetallicRoughness.baseColorFactor = color;
  }

  if (material.isMeshStandardMaterial) {
    materialDef.pbrMetallicRoughness.metallicFactor = material.metalness;
    materialDef.pbrMetallicRoughness.roughnessFactor = material.roughness;
  } else {
    materialDef.pbrMetallicRoughness.metallicFactor = 0.5;
    materialDef.pbrMetallicRoughness.roughnessFactor = 0.5;
  }

  // pbrMetallicRoughness.metallicRoughnessTexture
  if (material.metalnessMap || material.roughnessMap) {
    const metalRoughTexture = this.buildMetalRoughTexture(
      material.metalnessMap,
      material.roughnessMap,
    );

    const metalRoughMapDef: MapDef = {
      index: this.processTexture(metalRoughTexture),
      channel: metalRoughTexture.channel,
    };
    this.applyTextureTransform(metalRoughMapDef, metalRoughTexture);
    materialDef.pbrMetallicRoughness.metallicRoughnessTexture =
      metalRoughMapDef;
  }

  // pbrMetallicRoughness.baseColorTexture
  if (material.map) {
    const baseColorMapDef: MapDef = {
      index: this.processTexture(material.map),
      texCoord: material.map.channel,
    };
    this.applyTextureTransform(baseColorMapDef, material.map);
    materialDef.pbrMetallicRoughness.baseColorTexture = baseColorMapDef;
  }

  if (material.emissive) {
    const emissive = material.emissive;
    const maxEmissiveComponent = Math.max(emissive.r, emissive.g, emissive.b);

    if (maxEmissiveComponent > 0) {
      materialDef.emissiveFactor = material.emissive.toArray();
    }

    // emissiveTexture
    if (material.emissiveMap) {
      const emissiveMapDef: MapDef = {
        index: this.processTexture(material.emissiveMap),
        texCoord: material.emissiveMap.channel,
      };
      this.applyTextureTransform(emissiveMapDef, material.emissiveMap);
      materialDef.emissiveTexture = emissiveMapDef;
    }
  }

  // normalTexture
  if (material.normalMap) {
    const normalMapDef: MapDef = {
      index: this.processTexture(material.normalMap),
      texCoord: material.normalMap.channel,
    };

    if (material.normalScale && material.normalScale.x !== 1) {
      // glTF normal scale is univariate. Ignore `y`, which may be flipped.
      // Context: https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995
      normalMapDef.scale = material.normalScale.x;
    }

    this.applyTextureTransform(normalMapDef, material.normalMap);
    materialDef.normalTexture = normalMapDef;
  }

  // occlusionTexture
  if (material.aoMap) {
    const occlusionMapDef: MapDef = {
      index: this.processTexture(material.aoMap),
      texCoord: material.aoMap.channel,
    };

    if (material.aoMapIntensity !== 1.0) {
      occlusionMapDef.strength = material.aoMapIntensity;
    }

    this.applyTextureTransform(occlusionMapDef, material.aoMap);
    materialDef.occlusionTexture = occlusionMapDef;
  }

  // alphaMode
  if (material.transparent) {
    materialDef.alphaMode = 'BLEND';
  } else {
    if (material.alphaTest > 0.0) {
      materialDef.alphaMode = 'MASK';
      materialDef.alphaCutoff = material.alphaTest;
    }
  }

  // doubleSided
  if (material.side === THREE.DoubleSide) materialDef.doubleSided = true;
  if (material.name !== '') materialDef.name = material.name;

  this.serializeUserData(material, materialDef);

  this._invokeAll(function (ext: any) {
    ext.writeMaterial && ext.writeMaterial(material, materialDef);
  });

  const index = json.materials.push(materialDef) - 1;
  cache.materials.set(material, index);
  return index;
};

export * from 'three-stdlib';
export { GLTFExporter };

function equalArray(array1: any[], array2: any[]) {
  return (
    array1.length === array2.length &&
    array1.every(function (element: any, index: number) {
      return element === array2[index];
    })
  );
}
