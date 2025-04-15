import * as THREE from 'three';
import { awaitAll } from '../manager/assets/AssetUtils';
import { VFile } from '../manager/assets/VFile';
import VMaterial from '../manager/assets/VMaterial';

declare module 'three' {
  interface Material {
    toAsset(): Promise<VFile<VMaterial>>;
  }
}

type Awaitable<T> = T | Promise<T>;
type AwaitablePartial<T> = {
  [P in keyof T]?: Awaitable<T[P]>;
};

THREE.Material.prototype.toAsset = async function () {
  const data: AwaitablePartial<VMaterial> = {};

  const mat = this as THREE.MeshPhysicalMaterial;
  const phong = this as THREE.MeshPhongMaterial;
  const toon = this as THREE.MeshToonMaterial;
  const points = this as THREE.PointsMaterial;

  // standard Material serialization
  data.uuid = mat.hash;
  data.type = mat.type;

  // handle maps first
  {
    if (mat.clearcoatMap && mat.clearcoatMap.isTexture) {
      data.clearcoatMap = mat.clearcoatMap.toAsset();
    }

    if (mat.clearcoatRoughnessMap && mat.clearcoatRoughnessMap.isTexture) {
      data.clearcoatRoughnessMap = mat.clearcoatRoughnessMap.toAsset();
    }

    if (mat.clearcoatNormalMap && mat.clearcoatNormalMap.isTexture) {
      data.clearcoatNormalMap = mat.clearcoatNormalMap.toAsset();
      data.clearcoatNormalScale = mat.clearcoatNormalScale.toArray();
    }

    if (mat.iridescenceMap && mat.iridescenceMap.isTexture) {
      data.iridescenceMap = mat.iridescenceMap.toAsset();
    }
  }

  if (mat.name !== '') data.name = mat.name;

  if (mat.color && mat.color.isColor) data.color = mat.color.getHex();

  if (mat.roughness !== undefined) data.roughness = mat.roughness;
  if (mat.metalness !== undefined) data.metalness = mat.metalness;

  if (mat.sheen !== undefined) data.sheen = mat.sheen;
  if (mat.sheenColor && mat.sheenColor.isColor)
    data.sheenColor = mat.sheenColor.getHex();
  if (mat.sheenRoughness !== undefined)
    data.sheenRoughness = mat.sheenRoughness;
  if (mat.emissive && mat.emissive.isColor)
    data.emissive = mat.emissive.getHex();
  if (mat.emissiveIntensity !== undefined && mat.emissiveIntensity !== 1)
    data.emissiveIntensity = mat.emissiveIntensity;

  if (phong.specular && phong.specular.isColor)
    data.specular = phong.specular.getHex();
  if (mat.specularIntensity !== undefined)
    data.specularIntensity = mat.specularIntensity;
  if (mat.specularColor && mat.specularColor.isColor)
    data.specularColor = mat.specularColor.getHex();
  if (phong.shininess !== undefined) data.shininess = phong.shininess;
  if (mat.clearcoat !== undefined) data.clearcoat = mat.clearcoat;
  if (mat.clearcoatRoughness !== undefined)
    data.clearcoatRoughness = mat.clearcoatRoughness;

  if (mat.dispersion !== undefined) data.dispersion = mat.dispersion;

  if (mat.iridescence !== undefined) data.iridescence = mat.iridescence;
  if (mat.iridescenceIOR !== undefined)
    data.iridescenceIOR = mat.iridescenceIOR;
  if (mat.iridescenceThicknessRange !== undefined)
    data.iridescenceThicknessRange = mat.iridescenceThicknessRange as any; // 그대로 복사해왔는데 왜 타입에러가 나는것일까

  if (mat.iridescenceThicknessMap && mat.iridescenceThicknessMap.isTexture) {
    data.iridescenceThicknessMap = mat.iridescenceThicknessMap.toAsset();
  }

  if (mat.anisotropyMap && mat.anisotropyMap.isTexture) {
    data.anisotropyMap = mat.anisotropyMap.toAsset();
  }

  if (mat.anisotropy !== undefined) data.anisotropy = mat.anisotropy;
  if (mat.anisotropyRotation !== undefined)
    data.anisotropyRotation = mat.anisotropyRotation;

  if (mat.map && mat.map.isTexture) data.map = mat.map.toAsset();
  if (
    (this as THREE.MeshMatcapMaterial).matcap &&
    (this as THREE.MeshMatcapMaterial).matcap!.isTexture
  )
    data.matcap = (this as THREE.MeshMatcapMaterial).matcap!.toAsset();
  if (mat.alphaMap && mat.alphaMap.isTexture)
    data.alphaMap = mat.alphaMap.toAsset();

  if (mat.lightMap && mat.lightMap.isTexture) {
    data.lightMap = mat.lightMap.toAsset();
    data.lightMapIntensity = mat.lightMapIntensity;
  }

  if (mat.aoMap && mat.aoMap.isTexture) {
    data.aoMap = mat.aoMap.toAsset();
    data.aoMapIntensity = mat.aoMapIntensity;
  }

  if (mat.bumpMap && mat.bumpMap.isTexture) {
    data.bumpMap = mat.bumpMap.toAsset();
    data.bumpScale = mat.bumpScale;
  }

  if (mat.normalMap && mat.normalMap.isTexture) {
    data.normalMap = mat.normalMap.toAsset();
    data.normalMapType = mat.normalMapType;
    data.normalScale = mat.normalScale.toArray();
  }

  if (mat.displacementMap && mat.displacementMap.isTexture) {
    data.displacementMap = mat.displacementMap.toAsset();
    data.displacementScale = mat.displacementScale;
    data.displacementBias = mat.displacementBias;
  }

  if (mat.roughnessMap && mat.roughnessMap.isTexture)
    data.roughnessMap = mat.roughnessMap.toAsset();
  if (mat.metalnessMap && mat.metalnessMap.isTexture)
    data.metalnessMap = mat.metalnessMap.toAsset();

  if (mat.emissiveMap && mat.emissiveMap.isTexture)
    data.emissiveMap = mat.emissiveMap.toAsset();
  if (phong.specularMap && phong.specularMap.isTexture)
    data.specularMap = phong.specularMap.toAsset();
  if (mat.specularIntensityMap && mat.specularIntensityMap.isTexture)
    data.specularIntensityMap = mat.specularIntensityMap.toAsset();
  if (mat.specularColorMap && mat.specularColorMap.isTexture)
    data.specularColorMap = mat.specularColorMap.toAsset();

  if (mat.envMap && mat.envMap.isTexture) {
    data.envMap = mat.envMap.toAsset();

    if (phong.combine !== undefined) data.combine = phong.combine;
  }

  if (mat.envMapRotation !== undefined)
    data.envMapRotation = mat.envMapRotation.toArray();
  if (mat.envMapIntensity !== undefined)
    data.envMapIntensity = mat.envMapIntensity;
  if (mat.reflectivity !== undefined) data.reflectivity = mat.reflectivity;
  if (phong.refractionRatio !== undefined)
    data.refractionRatio = phong.refractionRatio;

  if (toon.gradientMap && toon.gradientMap.isTexture) {
    data.gradientMap = toon.gradientMap.toAsset();
  }

  if (mat.transmission !== undefined) data.transmission = mat.transmission;
  if (mat.transmissionMap && mat.transmissionMap.isTexture)
    data.transmissionMap = mat.transmissionMap.toAsset();
  if (mat.thickness !== undefined) data.thickness = mat.thickness;
  if (mat.thicknessMap && mat.thicknessMap.isTexture)
    data.thicknessMap = mat.thicknessMap.toAsset();
  if (
    mat.attenuationDistance !== undefined &&
    mat.attenuationDistance !== Infinity
  )
    data.attenuationDistance = mat.attenuationDistance;
  if (mat.attenuationColor !== undefined)
    data.attenuationColor = mat.attenuationColor.getHex();

  if (points.size !== undefined) data.size = points.size;
  if (mat.shadowSide !== null) data.shadowSide = mat.shadowSide;
  if (points.sizeAttenuation !== undefined)
    data.sizeAttenuation = points.sizeAttenuation;

  if (mat.blending !== THREE.NormalBlending) data.blending = mat.blending;
  if (mat.side !== THREE.FrontSide) data.side = mat.side;
  if (mat.vertexColors === true) data.vertexColors = true;

  if (mat.opacity < 1) data.opacity = mat.opacity;
  if (mat.transparent === true) data.transparent = true;

  if (mat.blendSrc !== THREE.SrcAlphaFactor) data.blendSrc = mat.blendSrc;
  if (mat.blendDst !== THREE.OneMinusSrcAlphaFactor)
    data.blendDst = mat.blendDst;
  if (mat.blendEquation !== THREE.AddEquation)
    data.blendEquation = mat.blendEquation;
  if (mat.blendSrcAlpha !== null) data.blendSrcAlpha = mat.blendSrcAlpha;
  if (mat.blendDstAlpha !== null) data.blendDstAlpha = mat.blendDstAlpha;
  if (mat.blendEquationAlpha !== null)
    data.blendEquationAlpha = mat.blendEquationAlpha;
  if (mat.blendColor && mat.blendColor.isColor)
    data.blendColor = mat.blendColor.getHex();
  if (mat.blendAlpha !== 0) data.blendAlpha = mat.blendAlpha;

  if (mat.depthFunc !== THREE.LessEqualDepth) data.depthFunc = mat.depthFunc;
  if (mat.depthTest === false) data.depthTest = mat.depthTest;
  if (mat.depthWrite === false) data.depthWrite = mat.depthWrite;
  if (mat.colorWrite === false) data.colorWrite = mat.colorWrite;

  if (mat.stencilWriteMask !== 0xff)
    data.stencilWriteMask = mat.stencilWriteMask;
  if (mat.stencilFunc !== THREE.AlwaysStencilFunc)
    data.stencilFunc = mat.stencilFunc;
  if (mat.stencilRef !== 0) data.stencilRef = mat.stencilRef;
  if (mat.stencilFuncMask !== 0xff) data.stencilFuncMask = mat.stencilFuncMask;
  if (mat.stencilFail !== THREE.KeepStencilOp)
    data.stencilFail = mat.stencilFail;
  if (mat.stencilZFail !== THREE.KeepStencilOp)
    data.stencilZFail = mat.stencilZFail;
  if (mat.stencilZPass !== THREE.KeepStencilOp)
    data.stencilZPass = mat.stencilZPass;
  if (mat.stencilWrite === true) data.stencilWrite = mat.stencilWrite;

  // rotation (SpriteMaterial)
  if (
    (this as THREE.SpriteMaterial).rotation !== undefined &&
    (this as THREE.SpriteMaterial).rotation !== 0
  )
    data.rotation = (this as THREE.SpriteMaterial).rotation;

  if (mat.polygonOffset === true) data.polygonOffset = true;
  if (mat.polygonOffsetFactor !== 0)
    data.polygonOffsetFactor = mat.polygonOffsetFactor;
  if (mat.polygonOffsetUnits !== 0)
    data.polygonOffsetUnits = mat.polygonOffsetUnits;

  const line = this as THREE.LineDashedMaterial;
  if (line.linewidth !== undefined && line.linewidth !== 1)
    data.linewidth = line.linewidth;
  if (line.dashSize !== undefined) data.dashSize = line.dashSize;
  if (line.gapSize !== undefined) data.gapSize = line.gapSize;
  if (line.scale !== undefined) data.scale = line.scale;

  if (mat.dithering === true) data.dithering = true;

  if (mat.alphaTest > 0) data.alphaTest = mat.alphaTest;
  if (mat.alphaHash === true) data.alphaHash = true;
  if (mat.alphaToCoverage === true) data.alphaToCoverage = true;
  if (mat.premultipliedAlpha === true) data.premultipliedAlpha = true;
  if (mat.forceSinglePass === true) data.forceSinglePass = true;

  if (mat.wireframe === true) data.wireframe = true;
  if (mat.wireframeLinewidth > 1)
    data.wireframeLinewidth = mat.wireframeLinewidth;
  if (mat.wireframeLinecap !== 'round')
    data.wireframeLinecap = mat.wireframeLinecap;
  if (mat.wireframeLinejoin !== 'round')
    data.wireframeLinejoin = mat.wireframeLinejoin;

  if (mat.flatShading === true) data.flatShading = true;

  if (mat.visible === false) data.visible = false;

  if (mat.toneMapped === false) data.toneMapped = false;

  if (mat.fog === false) data.fog = false;

  if (Object.keys(mat.userData).length > 0) data.userData = mat.userData;

  const retval: VFile<VMaterial> = {
    id: this.hash,
    type: 'VMaterial',
    data: data as VMaterial,
  };

  return awaitAll(retval);
};
