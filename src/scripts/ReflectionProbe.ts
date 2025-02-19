import { Object3DEventMap } from 'three';
import { TransformControls } from 'three-stdlib';
import { v4 } from 'uuid';
import { ENV, Layer } from '../Constants.ts';
import * as THREE from './VTHREE.ts';
import { uploadPngToKtx } from './atomUtils.ts';
import { getVKTX2Loader } from './loaders/VKTX2Loader.ts';
import VTextureLoader from './loaders/VTextureLoader.ts';
import { splitExtension } from './utils.ts';

const DEFAULT_RESOLUTION: ReflectionProbeResolutions = 1024;
const DEFAULT_POSITION: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
const DEFAULT_SIZE: THREE.Vector3 = new THREE.Vector3(4, 4, 4);
const CUBE_CAMERA_FILTER_LAYERS = [
  Layer.ReflectionBox,
  Layer.GizmoHelper,
  Layer.Selected,
  Layer.Hotspot,
  Layer.Room,
];
const REFLECTION_BOX_LAYER = Layer.ReflectionBox;
const CUBE_CAMERA_LAYER = 10;

const AvailableResolutions = [16, 32, 64, 128, 256, 512, 1024, 2048] as const;
export type ReflectionProbeResolutions = (typeof AvailableResolutions)[number];
const directions = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const;
export type CubeMapFaceBlobs = {
  [key in (typeof directions)[number]]: Blob;
};
export type CubeMapFaceUrls = {
  [key in (typeof directions)[number]]: string;
};

export type ReflectionProbeJSON = {
  name: string;
  id: string;
  center: number[];
  size: number[];
  resolution: ReflectionProbeResolutions;
  createFrom: 'probe.toJSON()';
  showProbe?: boolean;
  showControls?: boolean;
  url?: string;
  textureBlobs?: CubeMapFaceBlobs;
  textures?: CubeMapFaceUrls;
  textureUrls?: string[] | null;
  useCustomTexture: boolean;
  renderedTime?: number | null;
};

export interface ProbeMeshEventMap extends Object3DEventMap {
  updated: {};
}

// type Modes = 'box' | 'sphere';
const DEFAULT_TSIZE = 0.7;
const DEFAULT_SSIZE = 0.5;

export default class ReflectionProbe {
  // SCENE PROPERTIES
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  // RENDER PROPERTIES
  private pmremGenerator: THREE.PMREMGenerator;
  private renderTarget: THREE.WebGLCubeRenderTarget;
  private cubeCamera: THREE.CubeCamera;
  private cubeCameraNear: number = 0.1; // CubeCamera Near
  private cubeCameraFar: number = 1000; // CubeCamera 의 Far
  private resolution: ReflectionProbeResolutions = DEFAULT_RESOLUTION; // CubeTexture 해상도
  // RENDER MEASURES
  private center: THREE.Vector3 = DEFAULT_POSITION;
  private size: THREE.Vector3 = DEFAULT_SIZE;
  private readonly box: THREE.Box3;
  // RESULT OBJECTS
  private readonly boxMesh: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.Material,
    ProbeMeshEventMap
  >;
  private reflectionProbeSphere: THREE.Mesh;
  private quad: THREE.Mesh | undefined;
  private canvas: HTMLCanvasElement | undefined;
  private imageData: ImageData | null = null;
  // Probe Controllers
  private readonly translateControls: TransformControls<THREE.Camera>;
  private readonly scaleControls: TransformControls<THREE.Camera>;
  private sSize: number = DEFAULT_SSIZE; // Size of Probe Box Scale Controller
  private tSize: number = DEFAULT_TSIZE; // Size of Probe Box Translate Controller
  // PRIORITY PROPERTIES
  private serializedId: string = v4();
  private name: string;
  // Out Interaction Property
  private showProbe: boolean = true;
  private showControls: boolean = true;
  private autoUpdate: boolean = false;
  // Static Textures
  private customTexture: THREE.Texture | null = null;
  private textureUrls: string[] | null = null;
  private useCustomTexture: boolean = false;
  private renderedTime: number | null = null;
  private customRenderedTime: number | null = null;
  private animationFrame: number | null = null;
  private updatedFrame: number | null = null;

  // TODO 추후 개발
  // private modes: Modes = 'box';

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    resolution?: ReflectionProbeResolutions,
  ) {
    this.name = '프로브_' + this.serializedId;
    this.renderer = renderer;
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    pmremGenerator.compileCubemapShader();
    this.pmremGenerator = pmremGenerator;
    this.scene = scene;

    if (resolution) {
      this.resolution = resolution;
    }

    this.prepareQuad();

    if (!camera.layers.isEnabled(CUBE_CAMERA_LAYER)) {
      camera.layers.enableAll();
      camera.layers.enable(CUBE_CAMERA_LAYER);
    }

    this.renderTarget = new THREE.WebGLCubeRenderTarget(this.resolution, {
      format: THREE.RGBAFormat,
      generateMipmaps: false,
    });

    this.renderTarget.texture.type = THREE.HalfFloatType;

    const { height, center } = getBoxHeight(scene);

    this.size.setY(height);
    this.center.setY(center);
    this.box = new THREE.Box3().setFromCenterAndSize(this.center, this.size);

    // Create Cube Camera
    const cubeCamera = new THREE.CubeCamera(
      this.cubeCameraNear,
      this.cubeCameraFar,
      this.renderTarget,
    );
    cubeCamera.layers.enableAll();
    CUBE_CAMERA_FILTER_LAYERS.forEach(layer => {
      cubeCamera.layers.disable(layer);
    });

    // Create Sphere Mesh
    const sphereMesh = createProbeSphere();
    sphereMesh.scale.set(1 / this.size.x, 1 / this.size.y, 1 / this.size.z);
    sphereMesh.material.envMap = this.getTexture();
    sphereMesh.vUserData.probe = this;

    const boxMesh = createMeshFromBox(this.box, this.serializedId);
    boxMesh.add(sphereMesh);

    const translateControls = new TransformControls(
      camera,
      this.renderer.domElement,
    );
    translateControls.vUserData.isTransformControls = true;
    translateControls.vUserData.isProbeMesh = true;
    translateControls.vUserData.probeMeshType = 'controls';
    translateControls.setMode('translate');
    translateControls.setSize(this.tSize);
    const scaleControls = new TransformControls(
      camera,
      this.renderer.domElement,
    );
    scaleControls.vUserData.isTransformControls = true;
    scaleControls.vUserData.isProbeMesh = true;
    scaleControls.vUserData.probeMeshType = 'controls';
    scaleControls.setMode('scale');
    scaleControls.setSize(this.sSize);

    // @ts-ignore
    translateControls.addEventListener('dragging-changed', event => {
      document.dispatchEvent(
        new CustomEvent('control-dragged', { detail: { moving: event.value } }),
      );
    });

    // @ts-ignore
    scaleControls.addEventListener('dragging-changed', event => {
      document.dispatchEvent(
        new CustomEvent('control-dragged', { detail: { moving: event.value } }),
      );
    });

    // @ts-ignore
    translateControls.addEventListener('objectChange', event => {
      if (this.boxMesh) {
        const detail = {
          uuid: this.boxMesh.uuid,
          type: 'position',
          position: this.boxMesh.position.clone(),
          probeId: this.serializedId,
        };
        document.dispatchEvent(
          new CustomEvent('probeMesh-changed', { detail }),
        );
        this.setCenterAndSize(this.boxMesh.position, this.boxMesh.scale);
        if (this.autoUpdate) {
          this.applyTextureOnQuad();
        }
      }
    });

    // @ts-ignore
    scaleControls.addEventListener('objectChange', event => {
      if (this.boxMesh) {
        const detail = {
          uuid: this.boxMesh.uuid,
          type: 'scale',
          scale: this.boxMesh.scale.clone(),
        };
        document.dispatchEvent(
          new CustomEvent('probeMesh-changed', { detail }),
        );
        this.setCenterAndSize(this.boxMesh.position, this.boxMesh.scale);

        this.boxMesh.dispatchEvent({ type: 'updated' });
      }
    });

    translateControls.attach(boxMesh);
    scaleControls.attach(boxMesh);

    this.cubeCamera = cubeCamera;
    this.reflectionProbeSphere = sphereMesh;
    this.boxMesh = boxMesh;
    this.translateControls = translateControls;
    this.scaleControls = scaleControls;
    // const planeControls = new CubePlaneControls(camera, this.renderer);
    //
    // planeControls.attach(boxMesh);

    this.boxMesh.addEventListener('updated', event => {
      console.log('boxMesh updated', event);
    });
  }

  static getAvailableResolutions() {
    return AvailableResolutions;
  }

  private prepareQuad() {
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.RawShaderMaterial({
        uniforms: {
          // @ts-ignore
          map: { type: 't', value: null },
        },
        vertexShader: rawMaterialVertexShader,
        fragmentShader: rawMaterialFragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    );
    quad.scale.set(this.resolution / 2, this.resolution / 2, 1);
    this.quad = quad;

    // FOR Texture visualizing
    const canvas = document.createElement('canvas');
    canvas.style.width = this.resolution.toString();
    canvas.style.height = this.resolution.toString();
    canvas.width = this.resolution;
    canvas.height = this.resolution;
    this.canvas = canvas;
  }

  addToScene(render?: boolean) {
    this.scene.add(this.boxMesh, this.translateControls, this.scaleControls);
    this.updateCameraPosition(this.boxMesh.position, render);
  }

  removeFromScene() {
    this.boxMesh.removeFromParent();
    this.translateControls.removeFromParent();
    this.scaleControls.removeFromParent();
  }

  getControls() {
    return {
      translateControls: this.translateControls,
      scaleControls: this.scaleControls,
    };
  }

  getName() {
    return this.name;
  }

  setName(name: string) {
    this.name = name;
    document.dispatchEvent(
      new CustomEvent('probeName-changed', { detail: name }),
    );
    return this;
  }

  getControlSize() {
    return { tSize: this.tSize, sSize: this.sSize };
  }

  setControlSize(target: 'translate' | 'scale', size: number) {
    if (target === 'translate') {
      this.tSize = size;
      this.translateControls.setSize(size);
    } else if (target === 'scale') {
      this.sSize = size;
      this.scaleControls.setSize(size);
    }
    return this;
  }

  resetControlSize() {
    this.tSize = DEFAULT_TSIZE;
    this.sSize = DEFAULT_SSIZE;
    this.translateControls.setSize(this.tSize);
    this.scaleControls.setSize(this.sSize);
    return this;
  }

  // TODO unsafe call for transformControls => 방법 찾기
  setControlsVisible(visible: boolean) {
    this.translateControls.showX = visible;
    this.translateControls.showY = visible;
    this.translateControls.showZ = visible;
    this.scaleControls.showX = visible;
    this.scaleControls.showY = visible;
    this.scaleControls.showZ = visible;

    return this;
  }

  getResolution() {
    return this.resolution;
  }

  setResolution(resolution: ReflectionProbeResolutions) {
    this.resolution = resolution;
    this.renderTarget = new THREE.WebGLCubeRenderTarget(this.resolution, {
      format: THREE.RGBAFormat,
      generateMipmaps: false,
    });

    const cubeCamera = new THREE.CubeCamera(
      this.cubeCameraNear,
      this.cubeCameraFar,
      this.renderTarget,
    );
    cubeCamera.layers.enableAll();
    CUBE_CAMERA_FILTER_LAYERS.forEach(layer => {
      cubeCamera.layers.disable(layer);
    });
    cubeCamera.update(this.renderer, this.scene);
    this.cubeCamera = cubeCamera;

    this.updateCameraPosition(this.center, true);

    document.dispatchEvent(
      new CustomEvent('probeResolution-changed', { detail: resolution }),
    );

    this.scene.traverse(child => {
      if ('isMesh' in child) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material.vUserData.probeId === this.serializedId) {
          material.envMap = this.getTexture();
          material.needsUpdate = true;
        }
      }
    });

    const canvas = document.createElement('canvas');
    canvas.style.width = this.resolution.toString();
    canvas.style.height = this.resolution.toString();
    canvas.width = this.resolution;
    canvas.height = this.resolution;
    this.canvas = canvas;

    this.quad!!.scale.set(this.resolution / 2, this.resolution / 2, 1);

    this.applyTextureOnQuad();

    return this;
  }

  getId() {
    return this.serializedId;
  }

  setFromObject(object: THREE.Object3D) {
    if (object) {
      this.setCenterAndSize(getMeshCenterPosition(object), getMeshSize(object));
    } else {
      throw new Error(
        'ReflectionProbe.setFromObject() : Object Must Be Not null or undefined : ' +
          object,
      );
    }
  }

  setCenterAndSize(centerVector: THREE.Vector3, sizeVector: THREE.Vector3) {
    this.setCenter(centerVector);
    this.setSize(sizeVector);
    this.updateProbeMeshes();
  }

  setCenter(centerVector: THREE.Vector3, recursive?: boolean) {
    this.center = centerVector;
    if (recursive) {
      this.updateProbeMeshes();
    }
  }

  setSize(sizeVector: THREE.Vector3, recursive?: boolean) {
    this.size = sizeVector;
    if (recursive) {
      this.updateProbeMeshes();
    }
  }

  updateProbeMeshes() {
    this.updateBox();
    this.updateSphere();
  }

  updateBox(recursive?: boolean) {
    this.box.setFromCenterAndSize(this.center, this.size);
    if (recursive) {
      this.updateBoxMesh();
    }
  }

  updateBoxMesh() {
    this.boxMesh.position.copy(this.center);
    this.boxMesh.scale.copy(this.size);
    this.reflectionProbeSphere.scale.copy(this.size.clone().revert());
  }

  updateSphere() {
    this.reflectionProbeSphere.scale.set(
      1 / this.size.x,
      1 / this.size.y,
      1 / this.size.z,
    );
    this.updateCameraPosition(this.center);
  }

  getBoxMesh() {
    // this.updateObjectChildrenEnv();
    return this.boxMesh;
  }

  materialOnBeforeCompileFunc() {
    return materialOnBeforeCompileFunction(
      this.cubeCamera.position,
      this.boxMesh.scale,
      this.useCustomTexture,
    );
  }

  onBeforeCubeCameraUpdate() {
    const scene = this.scene;
    const gl = this.renderer;
    const isLocalClippingEnabled = gl.localClippingEnabled;
    const originalClippedPlanes = gl.clippingPlanes;
    if (isLocalClippingEnabled) {
      gl.localClippingEnabled = false;
    }

    const filterCondition = (object: THREE.Object3D) => {
      return (
        (object.isTransformControl() || object.vUserData.isTransformControls) &&
        object.visible
      );
    };

    const filteredObjects = scene.children.filter(filterCondition);

    filteredObjects.forEach(child => {
      child.visible = false;
    });

    return {
      filteredObjects,
      localClippingEnabled: isLocalClippingEnabled,
      originalClippedPlanes,
    };
  }

  onAfterCubeCameraUpdate({
    filteredObjects,
    localClippingEnabled,
    originalClippedPlanes,
  }: {
    filteredObjects: THREE.Object3D[];
    localClippingEnabled: boolean;
    originalClippedPlanes?: THREE.Plane[];
  }) {
    filteredObjects.forEach(child => {
      child.visible = true;
    });

    const gl = this.renderer;
    gl.localClippingEnabled = localClippingEnabled;
    if (originalClippedPlanes) {
      gl.clippingPlanes = originalClippedPlanes;
    }
  }

  applyTextureOnQuad() {
    const quad = this.quad!!;
    const canvas = this.canvas!!;
    const material = quad.material as THREE.RawShaderMaterial;
    material.uniforms.map.value = this.cubeCamera.renderTarget.texture;
    const size = this.resolution;
    const renderer = this.renderer;

    const camera = new THREE.OrthographicCamera(
      size / -4,
      size / 4,
      size / 4,
      size / -4,
      -10000,
      10000,
    );

    const scene = new THREE.Scene();
    scene.add(quad);

    const newRenderTarget = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    const originalRenderTarget = renderer.getRenderTarget()?.clone();
    renderer.setRenderTarget(newRenderTarget);
    renderer.render(scene, camera);
    if (originalRenderTarget) {
      renderer.setRenderTarget(originalRenderTarget);
    }

    const pixels = new Uint8Array(4 * size * size);
    renderer.readRenderTargetPixels(newRenderTarget, 0, 0, size, size, pixels);

    const imageData = new ImageData(new Uint8ClampedArray(pixels), size, size);

    this.imageData = imageData;
    const context = canvas.getContext('2d');
    if (context) {
      context.reset();
      context.putImageData(imageData, 0, 0);
    } else {
      alert('Canvas context를 생성할 수 없습니다.');
    }

    return imageData;
  }

  renderCamera(forceRender?: boolean) {
    if (!forceRender && this.customTexture && this.useCustomTexture) {
      console.log('no need to render');
      return;
    }
    // Before render => Set No Render Objects Invisible
    const beforeUpdateObject = this.onBeforeCubeCameraUpdate();
    // Set Original WebGLRenderer.autoClear value
    const rendererOriginalAutoClearValue = this.renderer.autoClear;
    // force Update WebGLRenderer.autoClear value to true
    this.renderer.autoClear = true;
    // Update Cube Camera
    this.cubeCamera.update(this.renderer, this.scene);
    // reset to WebGLRenderer.autoClear value to original
    this.renderer.autoClear = rendererOriginalAutoClearValue;
    // Apply envMap to ReflectionProbe Sphere
    (this.reflectionProbeSphere.material as THREE.MeshStandardMaterial).envMap =
      this.renderTarget.texture;
    // Apply Box In Box projected Meshes
    // this.updateObjectChildrenEnv();
    // After Render => set No Render Objects Visible
    this.onAfterCubeCameraUpdate(beforeUpdateObject);
    // Canvas Update
    // this.applyTextureOnQuad();
    document.dispatchEvent(new CustomEvent('probe-rendered', { detail: {} }));
    // console.log('probe Rendered : ' + this.serializedId);
    this.renderedTime = new Date().getTime();
  }

  updateCameraPosition(
    position: THREE.Vector3 = this.center,
    renderCamera?: boolean,
  ) {
    this.cubeCamera.position.copy(position);
    if (this.autoUpdate || renderCamera) {
      this.renderCamera(true);
    }
    return this;
  }

  getTexture(forceRender?: boolean): THREE.Texture {
    if (!forceRender && this.customTexture && this.useCustomTexture) {
      console.log('giving CustomTexture');
      return this.customTexture;
    }
    const cubeTexture = this.renderTarget.texture;
    const texture = this.pmremGenerator.fromCubemap(cubeTexture).texture;
    texture.vUserData.mimeType = 'probe-captured-image';
    return texture;
  }

  getTest() {
    const cubeTexture = this.renderTarget.texture;
    return this.pmremGenerator.fromCubemap(cubeTexture);
  }

  getRenderTargetTexture(): THREE.CubeTexture {
    return this.renderTarget.texture;
  }

  getRenderTarget(): THREE.WebGLCubeRenderTarget {
    return this.renderTarget;
  }

  async getEnvImage() {
    if (this.useCustomTexture && this.textureUrls) {
      return this.textureUrls;
    } else {
      return this.envToImage();
    }
  }

  async envToImage() {
    this.renderCamera();
    // Prepare for Image
    const imageSize = this.resolution;
    const renderer = this.renderer;
    const cubeRenderTarget = this.renderTarget;

    // Prepare Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2d Context Not Supported');
    }
    canvas.width = imageSize;
    canvas.height = imageSize;

    const faceTexture: Partial<CubeMapFaceBlobs> = {};
    const pixels = new Uint8Array(4 * imageSize * imageSize);

    const promises = directions.map(async (dir, faceIndex) => {
      const typedArray = await renderer.readRenderTargetPixelsAsync(
        cubeRenderTarget,
        0,
        0,
        imageSize,
        imageSize,
        pixels,
        faceIndex,
      );
      const imageData = new ImageData(
        new Uint8ClampedArray(typedArray),
        imageSize,
        imageSize,
      );
      ctx.putImageData(imageData, 0, 0);

      const blob = (await new Promise(resolve =>
        // @ts-ignore
        canvas.toBlob(resolve),
      )) as Blob;
      faceTexture[dir] = blob;
    });

    await Promise.all(promises);

    return faceTexture;
  }

  async uploadEnvImage() {
    const textureBlobs = await this.envToImage();

    // TODO Upload Texture Blob => to URL
    const files = Object.entries(textureBlobs).map(
      ([key, blob]) =>
        new File([blob], `probe_${this.serializedId}_${key}.png`),
    );

    await uploadPngToKtx(files);

    this.textureUrls = files.map(file => {
      return ENV.base + splitExtension(file.name).name + '.ktx';
    });

    console.log('uploadEnvImage Done');
  }

  async toJSON(): Promise<ReflectionProbeJSON> {
    console.log(this.customRenderedTime, this.renderedTime);
    if (
      !this.textureUrls ||
      (this.renderedTime &&
        this.customRenderedTime &&
        this.customRenderedTime < this.renderedTime)
    ) {
      await this.uploadEnvImage();
    }

    return {
      name: this.name,
      id: this.serializedId,
      center: this.center.toArray(),
      size: this.size.toArray(),
      resolution: this.resolution,
      createFrom: 'probe.toJSON()',
      showProbe: this.showProbe,
      showControls: this.showControls,
      textureUrls: this.textureUrls,
      useCustomTexture: this.useCustomTexture,
      renderedTime: this.renderedTime,
    };
  }

  async fromJSON(json: ReflectionProbeJSON): Promise<ReflectionProbe> {
    console.log('load Probe fromJSON : ', json.name);
    this.name = json.name;
    this.serializedId = json.id;
    this.center = new THREE.Vector3().fromArray(json.center);
    this.size = new THREE.Vector3().fromArray(json.size);
    this.resolution = json.resolution;
    if (json.renderedTime) {
      this.customRenderedTime = json.renderedTime;
    }
    this.quad!!.scale.set(this.resolution / 2, this.resolution / 2, 1);

    const canvas = document.createElement('canvas');
    canvas.style.width = this.resolution.toString();
    canvas.style.height = this.resolution.toString();
    canvas.width = this.resolution;
    canvas.height = this.resolution;
    this.canvas = canvas;

    // dispose Original RenderTarget
    this.renderTarget.dispose();

    // Update RenderTarget & CubeCamera
    this.renderTarget = new THREE.WebGLCubeRenderTarget(this.resolution, {
      format: THREE.RGBAFormat,
      generateMipmaps: false,
    });
    const cubeCamera = new THREE.CubeCamera(
      this.cubeCameraNear,
      this.cubeCameraFar,
      this.renderTarget,
    );
    cubeCamera.layers.enableAll();
    CUBE_CAMERA_FILTER_LAYERS.forEach(layer => {
      cubeCamera.layers.disable(layer);
    });
    this.cubeCamera = cubeCamera;

    this.boxMesh.vUserData.probeId = json.id;
    this.updateBoxMesh();

    if (json.showProbe !== undefined) {
      this.showProbe = json.showProbe;
    }

    if (json.showControls !== undefined) {
      this.showControls = json.showControls;
    }

    this.boxMesh.visible = this.showProbe;
    this.setControlsVisible(this.showProbe && this.showControls);

    if (json.textureUrls) {
      const loader = getVKTX2Loader(this.renderer);

      const textureUrls = json.textureUrls;

      const order = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

      const sortedTextures = textureUrls.sort((a, b) => {
        const getKey = (str: string) =>
          str.match(/_(px|nx|py|ny|pz|nz)\.ktx$/)[1];
        return order.indexOf(getKey(a)) - order.indexOf(getKey(b));
      });

      const loads = await Promise.all(
        sortedTextures.map(async url => await loader.loadAsync(url)),
      );

      loads.forEach(load => {
        load.flipY = false;
        load.needsUpdate = true;
      });

      const cubeTexture = new THREE.CubeTexture(loads);
      cubeTexture.mapping = THREE.CubeReflectionMapping;
      cubeTexture.format = loads[0].format;
      cubeTexture.generateMipmaps = false;
      cubeTexture.minFilter = THREE.LinearFilter;
      cubeTexture.needsUpdate = true;
      const pmremTexture = this.pmremGenerator.fromCubemap(cubeTexture).texture;
      pmremTexture.rotation = Math.PI;
      this.customTexture = pmremTexture;
      this.textureUrls = textureUrls;
    }

    if (json.useCustomTexture) {
      this.useCustomTexture = true;
    } else {
      cubeCamera.update(this.renderer, this.scene);
    }

    return this;
  }

  getShowProbe() {
    return this.showProbe;
  }

  getShowControls() {
    return this.showControls;
  }

  setShowProbe(showProbe: boolean) {
    this.showProbe = showProbe;
    this.setControlsVisible(this.showProbe && this.showControls);
  }

  setShowControls(showControls: boolean) {
    this.showControls = showControls;
    this.setControlsVisible(this.showProbe && this.showControls);
  }

  isAutoUpdate() {
    return this.autoUpdate;
  }

  setAutoUpdate(autoUpdate: boolean) {
    if (autoUpdate) {
      // this.animationFrame = requestAnimationFrame(this.renderLoop);
      this.renderCamera(true);
    } else {
      // if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    }
    this.autoUpdate = autoUpdate;
  }

  renderLoop = (timeStamp: number) => {
    if (!this.updatedFrame) {
      this.updatedFrame = timeStamp;
      this.renderCamera(true);
    } else {
      const elapsed = timeStamp - this.updatedFrame;
      if (elapsed >= 1000) {
        // 1초(1000ms)마다 렌더링
        this.updatedFrame = timeStamp;
        this.renderCamera(true);
      }
    }
    requestAnimationFrame(this.renderLoop);
  };

  getCanvas() {
    return this.canvas;
  }

  getImageData() {
    return this.imageData;
  }

  getCenter() {
    return this.center;
  }

  async setTextureFromFile(url: string | File) {
    const result = (await VTextureLoader.load(url, {
      gl: this.renderer,
    })) as THREE.Texture;
    // TODO something
    this.customTexture = result;
  }

  setTexture(texture: THREE.Texture) {
    this.customTexture = texture;
  }

  static isProbeJson(
    obj: any,
  ): obj is ReflectionProbeJSON | ReflectionProbeJSON[] {
    const isValidProbe = (item: any): item is ReflectionProbeJSON => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        Array.isArray(item.center) &&
        item.center.every((val: any) => typeof val === 'number') &&
        Array.isArray(item.size) &&
        item.size.every((val: any) => typeof val === 'number') &&
        AvailableResolutions.includes(item.resolution) &&
        item.createFrom === 'probe.toJSON()'
      );
    };

    if (Array.isArray(obj)) {
      return obj.every(isValidProbe);
    }

    return isValidProbe(obj);
  }

  createNewId(id: string = v4()) {
    this.serializedId = id;
  }

  static envProjectionFunction(
    pos: THREE.Vector3,
    size: THREE.Vector3,
    isCustomTexture: boolean,
  ) {
    return materialOnBeforeCompileFunction(pos, size, isCustomTexture);
  }

  isUseCustomTexture() {
    return this.useCustomTexture;
  }

  setUseCustomTexture(useCustomTexture: boolean) {
    this.useCustomTexture = useCustomTexture;
    if (useCustomTexture) {
    } else {
      this.renderCamera();
    }
  }
}

function getBoxHeight(scene: THREE.Scene) {
  const defaultHeight = 1;
  const defaultCenter = 0.5;
  const heightCorrection = 0.1;
  let minY = Infinity;
  let maxY = -Infinity;

  scene.traverse(child => {
    if (child.type === 'Mesh' && !child.vUserData.isProbeMesh) {
      const object = child as THREE.Mesh;
      object.geometry.computeBoundingBox();

      const boundingBox = object.geometry.boundingBox;

      if (boundingBox) {
        const boxMin = boundingBox.min.clone().applyMatrix4(object.matrixWorld);
        const boxMax = boundingBox.max.clone().applyMatrix4(object.matrixWorld);

        minY = Math.min(minY, boxMin.y);
        maxY = Math.max(maxY, boxMax.y);
      }
    }
  });

  const heightY = maxY - minY;
  const centerY = (maxY - minY) / 2;

  const resultHeight = heightY > 0 ? heightY : defaultHeight;
  const resultCenter = centerY > 0 ? centerY : defaultCenter;

  return {
    height: resultHeight + heightCorrection,
    center: resultCenter + heightCorrection / 2,
  };
}

function createMeshFromBox(box: THREE.Box3, serializedId: string) {
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // BoxGeometry 생성 (표면)
  const surfaceGeometry = new THREE.BoxGeometry(1, 1, 1);

  // 표면 Material 생성
  const surfaceMaterial = new THREE.MeshBasicMaterial({
    color: '#0077ff',
    transparent: true,
    opacity: 0.2, // 반투명 설정,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const mesh = new THREE.Mesh<
    THREE.BufferGeometry,
    THREE.Material,
    ProbeMeshEventMap
  >(surfaceGeometry, surfaceMaterial);
  // Set Mesh Layer not to detected on CubeCamera
  mesh.layers.set(REFLECTION_BOX_LAYER);
  mesh.vUserData.isProbeMesh = true;
  mesh.vUserData.probeId = serializedId;
  mesh.vUserData.probeMeshType = 'box';
  mesh.position.copy(center);
  mesh.scale.copy(size);

  const meshBox = new THREE.Box3();
  meshBox.setFromCenterAndSize(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 1, 1),
  );
  const boxHelper = new THREE.Box3Helper(meshBox, '#00deff');
  boxHelper.layers.set(REFLECTION_BOX_LAYER);
  boxHelper.vUserData.isProbeMesh = true;
  boxHelper.vUserData.probeMeshType = 'helper';
  mesh.add(boxHelper);
  return mesh;
}

function isTransformControlsChild(object: THREE.Object3D) {
  // Traverse upwards to check parent hierarchy
  let current = object;
  while (current) {
    if (current instanceof TransformControls) {
      return true; // Skip if it's part of TransformControls
    }
    current = current.parent;
  }
  return false;
}

function createBoxByCenterAndSize(center: THREE.Vector3, size: THREE.Vector3) {
  const halfSize = size.clone().multiplyScalar(0.5);
  const min = center.clone().sub(halfSize);
  const max = center.clone().add(halfSize);
  return new THREE.Box3(min, max);
}

function getMeshCenterPosition(mesh: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(mesh);
  const vector = new THREE.Vector3();
  box.getCenter(vector);
  return vector;
}

function getMeshSize(mesh: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(mesh);
  const vector = new THREE.Vector3();
  box.getSize(vector);
  return vector;
}

function createProbeSphere() {
  const geometry = new THREE.SphereGeometry(0.5, 32, 16);

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0,
    envMapIntensity: 1.0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.vUserData.isProbeMesh = true;
  mesh.vUserData.probeMeshType = 'sphere';
  return mesh;
}

const worldPosReplace = /* glsl */ `
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
    vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );

    #ifdef BOX_PROJECTED_ENV_MAP
        vWorldPosition = worldPosition.xyz;
    #endif
#endif
`;

const boxProjectDefinitions = /*glsl */ `
#ifdef BOX_PROJECTED_ENV_MAP
    uniform vec3 envMapSize;
    uniform vec3 envMapPosition;
    uniform bool isCustomTexture;
    varying vec3 vWorldPosition;
    
    vec3 parallaxCorrectNormal( vec3 v, vec3 cubeSize, vec3 cubePos ) {
        vec3 nDir = normalize( v );

        vec3 rbmax = ( .5 * cubeSize + cubePos - vWorldPosition ) / nDir;
        vec3 rbmin = ( -.5 * cubeSize + cubePos - vWorldPosition ) / nDir;

        vec3 rbminmax;

        rbminmax.x = ( nDir.x > 0. ) ? rbmax.x : rbmin.x;
        rbminmax.y = ( nDir.y > 0. ) ? rbmax.y : rbmin.y;
        rbminmax.z = ( nDir.z > 0. ) ? rbmax.z : rbmin.z;

        float correction = min( min( rbminmax.x, rbminmax.y ), rbminmax.z );
        vec3 boxIntersection = vWorldPosition + nDir * correction;
        vec3 retval = boxIntersection - cubePos;
        
        return isCustomTexture ? vec3(-retval.x, retval.y, retval.z) : retval;
    }
#endif
`;

// will be inserted after "vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );"
const getIBLIrradiance_patch = /* glsl */ `
#ifdef BOX_PROJECTED_ENV_MAP
    worldNormal = parallaxCorrectNormal( worldNormal, envMapSize, envMapPosition );
#endif
`;

// will be inserted after "reflectVec = inverseTransformDirection( reflectVec, viewMatrix );"
const getIBLRadiance_patch = /* glsl */ `
#ifdef BOX_PROJECTED_ENV_MAP
    reflectVec = parallaxCorrectNormal( reflectVec, envMapSize, envMapPosition );
#endif
`;

const materialOnBeforeCompileFunction = (
  pos: THREE.Vector3,
  size: THREE.Vector3,
  isCustomTexture: boolean,
) => {
  return (shader: THREE.WebGLProgramParametersWithUniforms) => {
    useBoxProjectedEnvMap(shader, pos, size, false);
  };
};

function useBoxProjectedEnvMap(
  shader: THREE.WebGLProgramParametersWithUniforms,
  envMapPosition: THREE.Vector3,
  envMapSize: THREE.Vector3,
  isCustomTexture: boolean = false,
) {
  console.log('isCustomTexture: ', isCustomTexture);
  // defines
  if (!shader.defines) {
    shader.defines = {};
  }
  shader.defines.BOX_PROJECTED_ENV_MAP = true;

  // uniforms
  shader.uniforms.envMapPosition = {
    value: envMapPosition,
  };

  shader.uniforms.envMapSize = {
    value: envMapSize,
  };

  shader.uniforms.isCustomTexture = {
    value: isCustomTexture,
  };

  // vertex shader
  shader.vertexShader =
    'varying vec3 vWorldPosition;\n' +
    shader.vertexShader.replace('#include <worldpos_vertex>', worldPosReplace);

  // fragment shader
  shader.fragmentShader =
    boxProjectDefinitions +
    '\n' +
    shader.fragmentShader
      .replace(
        '#include <envmap_physical_pars_fragment>',
        THREE.ShaderChunk.envmap_physical_pars_fragment,
      )
      .replace(
        'vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );',
        `
            vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
            ${getIBLIrradiance_patch}
            `,
      )
      .replace(
        'reflectVec = inverseTransformDirection( reflectVec, viewMatrix );',
        `
            reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
            ${getIBLRadiance_patch}
            `,
      );
}

function download(imageData: ImageData) {
  const canvas = document.createElement('canvas');
  canvas.width = 60;
  canvas.height = 60;
  const context = canvas.getContext('2d');
  if (context) {
    context.putImageData(imageData, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const fileName = 'test.png';
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.setAttribute('download', fileName);
        anchor.innerHTML = 'downloading...';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        setTimeout(() => {
          anchor.click();
          document.body.removeChild(anchor);
        }, 1);
      } else {
        alert('Canvas.ToBlob failed');
        console.log('blob is null : ', canvas, context);
      }
    }, 'image/png');
  } else {
    alert('Canvas context를 생성할 수 없습니다.');
  }
}

const rawMaterialVertexShader = `
attribute vec3 position;
attribute vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying vec2 vUv;

void main()  {

	vUv = vec2( 1.- uv.x, uv.y );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}
`;

const rawMaterialFragmentShader = `
precision mediump float;

uniform samplerCube map;

varying vec2 vUv;

#define M_PI 3.1415926535897932384626433832795

void main()  {

	vec2 uv = vUv;

	float longitude = uv.x * 2. * M_PI - M_PI + M_PI / 2.;
	float latitude = uv.y * M_PI;

	vec3 dir = vec3(
		- sin( longitude ) * sin( latitude ),
		cos( latitude ),
		- cos( longitude ) * sin( latitude )
	);
	normalize( dir );

	gl_FragColor = textureCube( map, dir );

}
`;
