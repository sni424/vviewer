import VGLTFLoader from 'src/scripts/loaders/VGLTFLoader';
import { getVKTX2Loader } from 'src/scripts/loaders/VKTX2Loader';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { THREE } from 'VTHREE';

export default class VRenderer {
  // Field values
  static canvasContainer: HTMLDivElement;
  static camera: THREE.PerspectiveCamera;
  static renderer: THREE.WebGLRenderer;
  static controls: OrbitControls;
  static dom: HTMLCanvasElement;
  static scene: THREE.Scene; // 외부에서 넣어줘야한다

  static _isInited = false;
  static checkInit() {
    if (!VRenderer._isInited) throw new Error('VTHREE.init() 필요');
  }

  // Options
  static useOrbit: boolean = true;

  static init(parent: HTMLDivElement, scene?: THREE.Scene) {
    if (VRenderer._isInited) {
      VRenderer.cleanup();
    }

    VRenderer._isInited = true;
    VRenderer.canvasContainer = parent;

    const { width, height } = VRenderer.canvasSize();

    VRenderer.scene = scene ?? new THREE.Scene();

    VRenderer.camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000,
    );
    VRenderer.camera.position.set(0, 1, 5);

    VRenderer.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    VRenderer.renderer.setSize(width, height);
    VRenderer.renderer.setPixelRatio(window.devicePixelRatio);

    // VGLTFLoader, VKTX2Loader 이닛
    getVKTX2Loader(VRenderer.renderer);
    new VGLTFLoader(VRenderer.renderer);

    VRenderer.dom = VRenderer.renderer.domElement;
    // VRenderer.dom.width = width;
    // VRenderer.dom.height = height;
    // VRenderer.dom.className = 'absolute top-0 left-0 z-0 pointer-events-auto'; // Add Tailwind classes

    VRenderer.controls = new OrbitControls(VRenderer.camera, VRenderer.dom);
    VRenderer.controls.enableDamping = true;

    window.addEventListener('resize', VRenderer._onResize);

    VRenderer._addDomToParent();

    console.log('VTHREE initialized');

    return this;
  }

  protected static _onResize() {
    const { width, height } = VRenderer.canvasSize();
    VRenderer.camera.aspect = width / height;
    VRenderer.camera.updateProjectionMatrix();
    VRenderer.renderer.setSize(width, height);
  }

  static cleanup() {
    if (VRenderer.renderer) {
      VRenderer.renderer.dispose();
    }

    if (VRenderer.controls) {
      VRenderer.controls.dispose();
    }

    if (VRenderer.canvasContainer) {
      VRenderer.canvasContainer.removeChild(VRenderer.dom);
    }

    VRenderer._isInited = false;

    window.removeEventListener('resize', VRenderer._onResize);

    return this;
  }

  static canvasSize() {
    VRenderer.checkInit();

    const parent = VRenderer.canvasContainer;
    // const rect = parent.getBoundingClientRect();
    // const width = Math.floor(rect.width);
    // const height = Math.floor(rect.height);
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    return { width, height };
  }

  static render() {
    const scene = VRenderer.scene;
    if (!scene) {
      console.error('VTHREE scene is not set');
      return;
    }

    VRenderer.checkInit();

    const { camera, renderer, controls, useOrbit } = VRenderer;

    if (useOrbit) {
      controls.update();
    }

    renderer.render(scene, camera);

    return this;
  }

  protected static _addDomToParent() {
    VRenderer.checkInit();

    const parent = VRenderer.canvasContainer;
    const dom = VRenderer.dom;

    parent.appendChild(dom);

    return this;
  }
}
