import { THREE } from 'VTHREE';
import { AssetMgr } from './AssetMgr';
import BufferGeometryLoader from './BufferGeometryLoader';
import MaterialLoader from './MaterialLoader';
import TextureLoader from './TextureLoader';
import { VFile, VRemoteFile } from './VFile';

const OBJECT3D_TYPES = ['VObject3D', 'VMesh', 'VGroup', 'VScene'];

export default async function ObjectLoader(
  vfile: VFile | VRemoteFile,
): Promise<THREE.Object3D> {
  const { id, type, data } = vfile as any;

  if (data.uuid !== id) {
    console.error(vfile);
    throw new Error('uuid가 다릅니다');
  }

  if (!OBJECT3D_TYPES.includes(type)) {
    throw new Error('VObject3D가 아닙니다');
  }

  let object: THREE.Object3D;
  let geometry, material;

  switch (data.type) {
    case 'Scene':
      const scene = new THREE.Scene();

      if (data.background !== undefined) {
        if (Number.isInteger(data.background)) {
          scene.background = new THREE.Color(data.background);
        } else {
          scene.background = await TextureLoader(data.background);
        }
      }

      if (data.environment !== undefined) {
        const cache = AssetMgr.cache;
        const loaded = AssetMgr.getCache(data.environment);
        debugger;
        scene.environment = await TextureLoader(data.environment);
      }

      if (data.fog !== undefined) {
        if (data.fog.type === 'Fog') {
          scene.fog = new THREE.Fog(
            data.fog.color,
            data.fog.near,
            data.fog.far,
          );
        } else if (data.fog.type === 'FogExp2') {
          scene.fog = new THREE.FogExp2(data.fog.color, data.fog.density);
        }

        if (data.fog.name !== '') {
          scene.fog!.name = data.fog.name;
        }
      }

      if (data.backgroundBlurriness !== undefined)
        scene.backgroundBlurriness = data.backgroundBlurriness;
      if (data.backgroundIntensity !== undefined)
        scene.backgroundIntensity = data.backgroundIntensity;
      if (data.backgroundRotation !== undefined)
        scene.backgroundRotation.fromArray(data.backgroundRotation);

      if (data.environmentIntensity !== undefined)
        scene.environmentIntensity = data.environmentIntensity;
      if (data.environmentRotation !== undefined)
        scene.environmentRotation.fromArray(data.environmentRotation);

      object = scene;

      break;

    case 'PerspectiveCamera':
      const perspectiveCamera = new THREE.PerspectiveCamera(
        data.fov,
        data.aspect,
        data.near,
        data.far,
      );

      if (data.focus !== undefined) perspectiveCamera.focus = data.focus;
      if (data.zoom !== undefined) perspectiveCamera.zoom = data.zoom;
      if (data.filmGauge !== undefined)
        perspectiveCamera.filmGauge = data.filmGauge;
      if (data.filmOffset !== undefined)
        perspectiveCamera.filmOffset = data.filmOffset;
      if (data.view !== undefined)
        perspectiveCamera.view = Object.assign({}, data.view);

      object = perspectiveCamera;

      break;

    case 'OrthographicCamera':
      const orthographicCamera = new THREE.OrthographicCamera(
        data.left,
        data.right,
        data.top,
        data.bottom,
        data.near,
        data.far,
      );

      if (data.zoom !== undefined) orthographicCamera.zoom = data.zoom;
      if (data.view !== undefined)
        orthographicCamera.view = Object.assign({}, data.view);

      object = orthographicCamera;

      break;

    case 'AmbientLight':
      object = new THREE.AmbientLight(data.color, data.intensity);

      break;

    case 'DirectionalLight':
      object = new THREE.DirectionalLight(data.color, data.intensity);
      (object as THREE.DirectionalLight).target = data.target || '';

      break;

    case 'PointLight':
      object = new THREE.PointLight(
        data.color,
        data.intensity,
        data.distance,
        data.decay,
      );

      break;

    case 'RectAreaLight':
      object = new THREE.RectAreaLight(
        data.color,
        data.intensity,
        data.width,
        data.height,
      );

      break;

    case 'SpotLight':
      object = new THREE.SpotLight(
        data.color,
        data.intensity,
        data.distance,
        data.angle,
        data.penumbra,
        data.decay,
      );
      (object as THREE.SpotLight).target = data.target || '';

      break;

    case 'HemisphereLight':
      object = new THREE.HemisphereLight(
        data.color,
        data.groundColor,
        data.intensity,
      );

      break;

    case 'LightProbe':
      object = new THREE.LightProbe().fromJSON(data);

      break;

    case 'SkinnedMesh':
      geometry = await BufferGeometryLoader(data.geometry);
      material = await MaterialLoader(data.material);

      const skinnedMesh = new THREE.SkinnedMesh(geometry, material);

      if (data.bindMode !== undefined) skinnedMesh.bindMode = data.bindMode;
      if (data.bindMatrix !== undefined)
        skinnedMesh.bindMatrix.fromArray(data.bindMatrix);
      if (data.skeleton !== undefined) skinnedMesh.skeleton = data.skeleton;

      object = skinnedMesh;

      break;

    case 'Mesh':
      geometry = await BufferGeometryLoader(data.geometry);
      material = await MaterialLoader(data.material);

      object = new THREE.Mesh(geometry, material);

      break;

    case 'InstancedMesh':
      geometry = await BufferGeometryLoader(data.geometry);
      material = await MaterialLoader(data.material);
      const count = data.count;
      const instanceMatrix = data.instanceMatrix;
      const instanceColor = data.instanceColor;

      const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
      instancedMesh.instanceMatrix = new THREE.InstancedBufferAttribute(
        new Float32Array(instanceMatrix.array),
        16,
      );
      if (instanceColor !== undefined)
        instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
          new Float32Array(instanceColor.array),
          instanceColor.itemSize,
        );

      object = instancedMesh;

      break;

    case 'BatchedMesh':
      geometry = await BufferGeometryLoader(data.geometry);
      material = await MaterialLoader(data.material);

      const batchedMesh = new THREE.BatchedMesh(
        data.maxInstanceCount,
        data.maxVertexCount,
        data.maxIndexCount,
        material,
      ) as any;
      batchedMesh.geometry = geometry;
      batchedMesh.perObjectFrustumCulled = data.perObjectFrustumCulled;
      batchedMesh.sortObjects = data.sortObjects;

      batchedMesh._drawRanges = data.drawRanges;
      batchedMesh._reservedRanges = data.reservedRanges;

      batchedMesh._visibility = data.visibility;
      batchedMesh._active = data.active;
      batchedMesh._bounds = data.bounds.map((bound: any) => {
        const box = new THREE.Box3();
        box.min.fromArray(bound.boxMin);
        box.max.fromArray(bound.boxMax);

        const sphere = new THREE.Sphere();
        sphere.radius = bound.sphereRadius;
        sphere.center.fromArray(bound.sphereCenter);

        return {
          boxInitialized: bound.boxInitialized,
          box: box,

          sphereInitialized: bound.sphereInitialized,
          sphere: sphere,
        };
      });

      batchedMesh._maxInstanceCount = data.maxInstanceCount;
      batchedMesh._maxVertexCount = data.maxVertexCount;
      batchedMesh._maxIndexCount = data.maxIndexCount;

      batchedMesh._geometryInitialized = data.geometryInitialized;
      batchedMesh._geometryCount = data.geometryCount;

      batchedMesh._matricesTexture = await TextureLoader(
        data.matricesTexture.uuid,
      );
      if (data.colorsTexture !== undefined)
        batchedMesh._colorsTexture = await TextureLoader(
          data.colorsTexture.uuid,
        );

      break;

    case 'LOD':
      object = new THREE.LOD();

      break;

    case 'Line':
      object = new THREE.Line(
        await BufferGeometryLoader(data.geometry),
        await MaterialLoader(data.material),
      );

      break;

    case 'LineLoop':
      object = new THREE.LineLoop(
        await BufferGeometryLoader(data.geometry),
        await MaterialLoader(data.material),
      );

      break;

    case 'LineSegments':
      object = new THREE.LineSegments(
        await BufferGeometryLoader(data.geometry),
        await MaterialLoader(data.material),
      );

      break;

    case 'PointCloud':
    case 'Points':
      object = new THREE.Points(
        await BufferGeometryLoader(data.geometry),
        await MaterialLoader(data.material),
      );

      break;

    case 'Sprite':
      object = new THREE.Sprite(await MaterialLoader(data.material));

      break;

    case 'Group':
      object = new THREE.Group();

      break;

    case 'Bone':
      object = new THREE.Bone();

      break;

    default:
      object = new THREE.Object3D();
  }

  if (!object!) {
    throw new Error('Object가 생성되지 않았습니다');
  }

  object.uuid = data.uuid;

  if (data.name !== undefined) object.name = data.name;

  if (data.matrix !== undefined) {
    object.matrix.fromArray(data.matrix);

    if (data.matrixAutoUpdate !== undefined)
      object.matrixAutoUpdate = data.matrixAutoUpdate;
    if (object.matrixAutoUpdate)
      object.matrix.decompose(object.position, object.quaternion, object.scale);
  } else {
    if (data.position !== undefined) object.position.fromArray(data.position);
    if (data.rotation !== undefined) object.rotation.fromArray(data.rotation);
    if (data.quaternion !== undefined)
      object.quaternion.fromArray(data.quaternion);
    if (data.scale !== undefined) object.scale.fromArray(data.scale);
  }

  if (data.up !== undefined) object.up.fromArray(data.up);

  if (data.castShadow !== undefined) object.castShadow = data.castShadow;
  if (data.receiveShadow !== undefined)
    object.receiveShadow = data.receiveShadow;

  if (data.shadow) {
    if (data.shadow.intensity !== undefined)
      (object as any).shadow.intensity = data.shadow.intensity;
    if (data.shadow.bias !== undefined)
      (object as any).shadow.bias = data.shadow.bias;
    if (data.shadow.normalBias !== undefined)
      (object as any).shadow.normalBias = data.shadow.normalBias;
    if (data.shadow.radius !== undefined)
      (object as any).shadow.radius = data.shadow.radius;
    if (data.shadow.mapSize !== undefined)
      (object as any).shadow.mapSize.fromArray(data.shadow.mapSize);
    if (data.shadow.camera !== undefined)
      (object as any).shadow.camera = await ObjectLoader(data.shadow.camera);
  }

  if (data.visible !== undefined) object.visible = data.visible;
  if (data.frustumCulled !== undefined)
    object.frustumCulled = data.frustumCulled;
  if (data.renderOrder !== undefined) object.renderOrder = data.renderOrder;
  if (data.userData !== undefined) object.userData = data.userData;
  if (data.layers !== undefined) object.layers.mask = data.layers;

  if (data.children !== undefined) {
    const children = data.children;

    object.add(...(await Promise.all(children.map(ObjectLoader))));
  }

  if (data.animations !== undefined) {
    throw new Error('애니메이션구현 안됨');
    // const objectAnimations = data.animations;

    // for (let i = 0; i < objectAnimations.length; i++) {
    //   const uuid = objectAnimations[i];

    //   object.animations.push(animations[uuid]);
    // }
  }

  if (data.type === 'LOD') {
    throw new Error('LOD구현 안됨');
    // if (data.autoUpdate !== undefined) object.autoUpdate = data.autoUpdate;

    // const levels = data.levels;

    // for (let l = 0; l < levels.length; l++) {
    //   const level = levels[l];
    //   const child = object.getObjectByProperty('uuid', level.object);

    //   if (child !== undefined) {
    //     object.addLevel(child, level.distance, level.hysteresis);
    //   }
    // }
  }

  return object;
}
