import { VUserData } from 'src/scripts/vthree/VTHREETypes';
import { THREE } from 'VTHREE';
import '../../vthree/Material';
import { AssetMgr } from './AssetMgr';
import { awaitAll } from './AssetUtils';
import TextureLoader from './TextureLoader';
import { isVFile, VFile, VRemoteFile } from './VFile';
import VMaterial from './VMaterial';
import { isVTextureFile } from './VTexture';

function createMaterialFromType(type: string) {
  const materialLib = {
    ShadowMaterial: THREE.ShadowMaterial,
    SpriteMaterial: THREE.SpriteMaterial,
    RawShaderMaterial: THREE.RawShaderMaterial,
    ShaderMaterial: THREE.ShaderMaterial,
    PointsMaterial: THREE.PointsMaterial,
    MeshPhysicalMaterial: THREE.MeshPhysicalMaterial,
    MeshStandardMaterial: THREE.MeshStandardMaterial,
    MeshPhongMaterial: THREE.MeshPhongMaterial,
    MeshToonMaterial: THREE.MeshToonMaterial,
    MeshNormalMaterial: THREE.MeshNormalMaterial,
    MeshLambertMaterial: THREE.MeshLambertMaterial,
    MeshDepthMaterial: THREE.MeshDepthMaterial,
    MeshDistanceMaterial: THREE.MeshDistanceMaterial,
    MeshBasicMaterial: THREE.MeshBasicMaterial,
    MeshMatcapMaterial: THREE.MeshMatcapMaterial,
    LineDashedMaterial: THREE.LineDashedMaterial,
    LineBasicMaterial: THREE.LineBasicMaterial,
    Material: THREE.Material,
  };

  return new (materialLib as any)[type]();
}

export default async function (file: VFile | VRemoteFile) {
  return AssetMgr.get<VFile<VMaterial>>(file as any).then(async vfile => {
    if (!isVFile(vfile)) {
      throw new Error('file이 VFile도 아닙니다');
    }

    const { id, type, data: rawData } = vfile;
    if (type !== 'VMaterial') {
      throw new Error('VMaterial이 아닙니다');
    }

    // 텍스쳐를 먼저 다 받은 후 진행
    const awaitData = { ...rawData };

    for (const key in awaitData) {
      const value = (awaitData as any)[key];
      if (isVTextureFile(value)) {
        (awaitData as any)[key] = await TextureLoader(value);
      } else {
        (awaitData as any)[key] = value;
      }
    }

    return awaitAll(awaitData).then(data => {
      const mat = createMaterialFromType(data.type);
      if (data.uuid !== undefined) mat.uuid = data.uuid;
      if (data.name !== undefined) mat.name = data.name;
      if (data.color !== undefined && mat.color !== undefined)
        mat.color.setHex(data.color);
      if (data.roughness !== undefined) mat.roughness = data.roughness;
      if (data.metalness !== undefined) mat.metalness = data.metalness;
      if (data.sheen !== undefined) mat.sheen = data.sheen;
      if (data.sheenColor !== undefined)
        mat.sheenColor = new THREE.Color().setHex(data.sheenColor);
      if (data.sheenRoughness !== undefined)
        mat.sheenRoughness = data.sheenRoughness;
      if (data.emissive !== undefined && mat.emissive !== undefined)
        mat.emissive.setHex(data.emissive);
      if (data.specular !== undefined && mat.specular !== undefined)
        mat.specular.setHex(data.specular);
      if (data.specularIntensity !== undefined)
        mat.specularIntensity = data.specularIntensity;
      if (data.specularColor !== undefined && mat.specularColor !== undefined)
        mat.specularColor.setHex(data.specularColor);
      if (data.shininess !== undefined) mat.shininess = data.shininess;
      if (data.clearcoat !== undefined) mat.clearcoat = data.clearcoat;
      if (data.clearcoatRoughness !== undefined)
        mat.clearcoatRoughness = data.clearcoatRoughness;
      if (data.dispersion !== undefined) mat.dispersion = data.dispersion;
      if (data.iridescence !== undefined) mat.iridescence = data.iridescence;
      if (data.iridescenceIOR !== undefined)
        mat.iridescenceIOR = data.iridescenceIOR;
      if (data.iridescenceThicknessRange !== undefined)
        mat.iridescenceThicknessRange = data.iridescenceThicknessRange;
      if (data.transmission !== undefined) mat.transmission = data.transmission;
      if (data.thickness !== undefined) mat.thickness = data.thickness;
      if (data.attenuationDistance !== undefined)
        mat.attenuationDistance = data.attenuationDistance;
      if (
        data.attenuationColor !== undefined &&
        mat.attenuationColor !== undefined
      )
        mat.attenuationColor.setHex(data.attenuationColor);
      if (data.anisotropy !== undefined) mat.anisotropy = data.anisotropy;
      if (data.anisotropyRotation !== undefined)
        mat.anisotropyRotation = data.anisotropyRotation;
      if (data.fog !== undefined) mat.fog = data.fog;
      if (data.flatShading !== undefined) mat.flatShading = data.flatShading;
      if (data.blending !== undefined) mat.blending = data.blending;
      if (data.combine !== undefined) mat.combine = data.combine;
      if (data.side !== undefined) mat.side = data.side;
      if (data.shadowSide !== undefined) mat.shadowSide = data.shadowSide;
      if (data.opacity !== undefined) mat.opacity = data.opacity;
      if (data.transparent !== undefined) mat.transparent = data.transparent;
      if (data.alphaTest !== undefined) mat.alphaTest = data.alphaTest;
      if (data.alphaHash !== undefined) mat.alphaHash = data.alphaHash;
      if (data.depthFunc !== undefined) mat.depthFunc = data.depthFunc;
      if (data.depthTest !== undefined) mat.depthTest = data.depthTest;
      if (data.depthWrite !== undefined) mat.depthWrite = data.depthWrite;
      if (data.colorWrite !== undefined) mat.colorWrite = data.colorWrite;
      if (data.blendSrc !== undefined) mat.blendSrc = data.blendSrc;
      if (data.blendDst !== undefined) mat.blendDst = data.blendDst;
      if (data.blendEquation !== undefined)
        mat.blendEquation = data.blendEquation;
      if (data.blendSrcAlpha !== undefined)
        mat.blendSrcAlpha = data.blendSrcAlpha;
      if (data.blendDstAlpha !== undefined)
        mat.blendDstAlpha = data.blendDstAlpha;
      if (data.blendEquationAlpha !== undefined)
        mat.blendEquationAlpha = data.blendEquationAlpha;
      if (data.blendColor !== undefined && mat.blendColor !== undefined)
        mat.blendColor.setHex(data.blendColor);
      if (data.blendAlpha !== undefined) mat.blendAlpha = data.blendAlpha;
      if (data.stencilWriteMask !== undefined)
        mat.stencilWriteMask = data.stencilWriteMask;
      if (data.stencilFunc !== undefined) mat.stencilFunc = data.stencilFunc;
      if (data.stencilRef !== undefined) mat.stencilRef = data.stencilRef;
      if (data.stencilFuncMask !== undefined)
        mat.stencilFuncMask = data.stencilFuncMask;
      if (data.stencilFail !== undefined) mat.stencilFail = data.stencilFail;
      if (data.stencilZFail !== undefined) mat.stencilZFail = data.stencilZFail;
      if (data.stencilZPass !== undefined) mat.stencilZPass = data.stencilZPass;
      if (data.stencilWrite !== undefined) mat.stencilWrite = data.stencilWrite;

      if (data.wireframe !== undefined) mat.wireframe = data.wireframe;
      if (data.wireframeLinewidth !== undefined)
        mat.wireframeLinewidth = data.wireframeLinewidth;
      if (data.wireframeLinecap !== undefined)
        mat.wireframeLinecap = data.wireframeLinecap;
      if (data.wireframeLinejoin !== undefined)
        mat.wireframeLinejoin = data.wireframeLinejoin;

      if (data.rotation !== undefined) mat.rotation = data.rotation;

      if (data.linewidth !== undefined) mat.linewidth = data.linewidth;
      if (data.dashSize !== undefined) mat.dashSize = data.dashSize;
      if (data.gapSize !== undefined) mat.gapSize = data.gapSize;
      if (data.scale !== undefined) mat.scale = data.scale;

      if (data.polygonOffset !== undefined)
        mat.polygonOffset = data.polygonOffset;
      if (data.polygonOffsetFactor !== undefined)
        mat.polygonOffsetFactor = data.polygonOffsetFactor;
      if (data.polygonOffsetUnits !== undefined)
        mat.polygonOffsetUnits = data.polygonOffsetUnits;

      if (data.dithering !== undefined) mat.dithering = data.dithering;

      if (data.alphaToCoverage !== undefined)
        mat.alphaToCoverage = data.alphaToCoverage;
      if (data.premultipliedAlpha !== undefined)
        mat.premultipliedAlpha = data.premultipliedAlpha;
      if (data.forceSinglePass !== undefined)
        mat.forceSinglePass = data.forceSinglePass;

      if (data.visible !== undefined) mat.visible = data.visible;

      if (data.toneMapped !== undefined) mat.toneMapped = data.toneMapped;

      if (data.vertexColors !== undefined) {
        if (typeof data.vertexColors === 'number') {
          mat.vertexColors = data.vertexColors > 0 ? true : false;
        } else {
          mat.vertexColors = data.vertexColors;
        }
      }

      mat.userData =
        data.userData ??
        ({
          isVMaterial: true,
          hash: data.uuid,
        } as VUserData);

      // Shader Material
      {
        // if (mat.uniforms !== undefined) {
        //   for (const name in mat.uniforms) {
        //     const uniform = mat.uniforms[name];
        //     material.uniforms[name] = {};
        //     switch (uniform.type) {
        //       case 't':
        //         material.uniforms[name].value = getTexture(uniform.value);
        //         break;
        //       case 'c':
        //         material.uniforms[name].value = new Color().setHex(uniform.value);
        //         break;
        //       case 'v2':
        //         material.uniforms[name].value = new Vector2().fromArray(
        //           uniform.value,
        //         );
        //         break;
        //       case 'v3':
        //         material.uniforms[name].value = new Vector3().fromArray(
        //           uniform.value,
        //         );
        //         break;
        //       case 'v4':
        //         material.uniforms[name].value = new Vector4().fromArray(
        //           uniform.value,
        //         );
        //         break;
        //       case 'm3':
        //         material.uniforms[name].value = new Matrix3().fromArray(
        //           uniform.value,
        //         );
        //         break;
        //       case 'm4':
        //         material.uniforms[name].value = new Matrix4().fromArray(
        //           uniform.value,
        //         );
        //         break;
        //       default:
        //         material.uniforms[name].value = uniform.value;
        //     }
        //   }
        // }
        // if (mat.defines !== undefined) material.defines = mat.defines;
        // if (mat.vertexShader !== undefined)
        //   material.vertexShader = mat.vertexShader;
        // if (mat.fragmentShader !== undefined)
        //   material.fragmentShader = mat.fragmentShader;
        // if (mat.glslVersion !== undefined) material.glslVersion = mat.glslVersion;
        // if (mat.extensions !== undefined) {
        //   for (const key in mat.extensions) {
        //     material.extensions[key] = mat.extensions[key];
        //   }
        // }
        // if (mat.lights !== undefined) material.lights = mat.lights;
        // if (mat.clipping !== undefined) material.clipping = mat.clipping;
      }

      // for PointsMaterial

      if (data.size !== undefined) mat.size = data.size;
      if (data.sizeAttenuation !== undefined)
        mat.sizeAttenuation = data.sizeAttenuation;

      // maps

      if (data.map !== undefined) mat.map = data.map;
      if (data.matcap !== undefined) mat.matcap = data.matcap;

      if (data.alphaMap !== undefined) mat.alphaMap = data.alphaMap;

      if (data.bumpMap !== undefined) mat.bumpMap = data.bumpMap;
      if (data.bumpScale !== undefined) mat.bumpScale = data.bumpScale;

      if (data.normalMap !== undefined) mat.normalMap = data.normalMap;
      if (data.normalMapType !== undefined)
        mat.normalMapType = data.normalMapType;
      if (data.normalScale !== undefined) {
        let normalScale = data.normalScale;

        if (Array.isArray(normalScale) === false) {
          // Blender exporter used to export a scalar. See #7459

          normalScale = [normalScale, normalScale];
        }

        mat.normalScale = new THREE.Vector2().fromArray(normalScale);
      }

      if (data.displacementMap !== undefined)
        mat.displacementMap = data.displacementMap;
      if (data.displacementScale !== undefined)
        mat.displacementScale = data.displacementScale;
      if (data.displacementBias !== undefined)
        mat.displacementBias = data.displacementBias;

      if (data.roughnessMap !== undefined) mat.roughnessMap = data.roughnessMap;
      if (data.metalnessMap !== undefined) mat.metalnessMap = data.metalnessMap;

      if (data.emissiveMap !== undefined) mat.emissiveMap = data.emissiveMap;
      if (data.emissiveIntensity !== undefined)
        mat.emissiveIntensity = data.emissiveIntensity;

      if (data.specularMap !== undefined) mat.specularMap = data.specularMap;
      if (data.specularIntensityMap !== undefined)
        mat.specularIntensityMap = data.specularIntensityMap;
      if (data.specularColorMap !== undefined)
        mat.specularColorMap = data.specularColorMap;

      if (data.envMap !== undefined) mat.envMap = data.envMap;
      if (data.envMapRotation !== undefined)
        mat.envMapRotation = new THREE.Euler().fromArray(data.envMapRotation);
      if (data.envMapIntensity !== undefined)
        mat.envMapIntensity = data.envMapIntensity;

      if (data.reflectivity !== undefined) mat.reflectivity = data.reflectivity;
      if (data.refractionRatio !== undefined)
        mat.refractionRatio = data.refractionRatio;

      if (data.lightMap !== undefined) mat.lightMap = data.lightMap;
      if (data.lightMapIntensity !== undefined)
        mat.lightMapIntensity = data.lightMapIntensity;

      if (data.aoMap !== undefined) mat.aoMap = data.aoMap;
      if (data.aoMapIntensity !== undefined)
        mat.aoMapIntensity = data.aoMapIntensity;

      if (data.gradientMap !== undefined) mat.gradientMap = data.gradientMap;

      if (data.clearcoatMap !== undefined) mat.clearcoatMap = data.clearcoatMap;
      if (data.clearcoatRoughnessMap !== undefined)
        mat.clearcoatRoughnessMap = data.clearcoatRoughnessMap;
      if (data.clearcoatNormalMap !== undefined)
        mat.clearcoatNormalMap = data.clearcoatNormalMap;
      if (data.clearcoatNormalScale !== undefined)
        mat.clearcoatNormalScale = new THREE.Vector2().fromArray(
          data.clearcoatNormalScale,
        );

      if (data.iridescenceMap !== undefined)
        mat.iridescenceMap = data.iridescenceMap;
      if (data.iridescenceThicknessMap !== undefined)
        mat.iridescenceThicknessMap = data.iridescenceThicknessMap;

      if (data.transmissionMap !== undefined)
        mat.transmissionMap = data.transmissionMap;
      if (data.thicknessMap !== undefined) mat.thicknessMap = data.thicknessMap;

      if (data.anisotropyMap !== undefined)
        mat.anisotropyMap = data.anisotropyMap;

      // if (mat.sheenColorMap !== undefined)
      //   material.sheenColorMap = getTexture(mat.sheenColorMap);
      // if (mat.sheenRoughnessMap !== undefined)
      //   material.sheenRoughnessMap = getTexture(mat.sheenRoughnessMap);

      mat.needsUpdate = true;
      return mat;
    });
  });
}
