import saveAs from 'file-saver';
import { THREE } from 'VTHREE';
import type ReflectionProbe from './ReflectionProbe';

let sharedPMREMGen: THREE.PMREMGenerator | null = null;

export function getProbeSize(i: number): { cols: number; rows: number } {
  // 자주 쓰는 1부터 36까지를 그냥 만들어버려서 함수가 그냥 hot해질 수 있게
  switch (i) {
    case 1:
      return { cols: 1, rows: 1 };
    case 2:
      return { cols: 1, rows: 2 };
    case 3:
      return { cols: 1, rows: 3 }; // 버리는 픽셀보단 낑겨서라도 꽉 채우기
    case 4:
      return { cols: 2, rows: 2 };
    case 5:
      return { cols: 1, rows: 5 }; // 2*3이 나을 수도 있긴 한데
    case 6:
      return { cols: 2, rows: 3 };
    case 7:
      return { cols: 2, rows: 4 }; // 7: { cols: 1, rows: 7 }
    case 8:
      return { cols: 2, rows: 4 };
    case 9:
      return { cols: 3, rows: 3 };
    case 10:
      return { cols: 2, rows: 5 };
    case 11:
      return { cols: 3, rows: 4 };
    case 12:
      return { cols: 3, rows: 4 };
    case 13:
      return { cols: 3, rows: 5 };
    case 14:
      return { cols: 3, rows: 5 };
    case 15:
      return { cols: 3, rows: 5 };
    case 16:
      return { cols: 4, rows: 4 };
    case 17:
      return { cols: 4, rows: 5 };
    case 18:
      return { cols: 4, rows: 5 };
    case 19:
      return { cols: 4, rows: 5 };
    case 20:
      return { cols: 4, rows: 5 };
    case 21:
      return { cols: 5, rows: 5 };
    case 22:
      return { cols: 5, rows: 5 };
    case 23:
      return { cols: 5, rows: 5 };
    case 24:
      return { cols: 6, rows: 4 };
    case 25:
      return { cols: 5, rows: 5 };
    case 26:
      return { cols: 6, rows: 5 };
    case 27:
      return { cols: 6, rows: 5 };
    case 28:
      return { cols: 6, rows: 5 };
    case 29:
      return { cols: 6, rows: 5 };
    case 30:
      return { cols: 6, rows: 5 };
    case 31:
      return { cols: 6, rows: 6 };
    case 32:
      return { cols: 6, rows: 6 };
    case 33:
      return { cols: 6, rows: 6 };
    case 34:
      return { cols: 6, rows: 6 };
    case 35:
      return { cols: 6, rows: 6 };
    case 36:
      return { cols: 6, rows: 6 };
  }

  throw new Error(`Invalid probe size: ${i}`);

  // // 실제로 작동하는 코드이지만 그냥 여기까지 오기 전에 상수로 처리한다.
  // // 범위를 넘어서는 값은 그냥 죽여버림
  // const cols = Math.floor(Math.sqrt(i));
  // const isPerfectSquare = i / cols === 1;

  // // 2*2, 3*3, 4*4, ...
  // if (isPerfectSquare) {
  //   return {
  //     cols,
  //     rows: cols,
  //   };
  // }

  // const rows = Math.ceil(i / cols);
  // return {
  //   cols,
  //   rows,
  // };
}

// Three.js의 CubeCamera.update()에다가 onAfterFaceRender를 추가.
// gl 상태관리가 엉망이라 각 face 렌더 후 바로 픽셀값을 읽어오는 로직이 필요하다.
function cubeCameraUpdaterWithOnAfterFaceRender(
  this: THREE.CubeCamera,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  onAfterFaceRender?: (
    faceIndex: number,
    renderTarget: THREE.WebGLRenderTarget,
    camera: THREE.PerspectiveCamera,
  ) => void,
) {
  if (this.parent === null) this.updateMatrixWorld();

  const { renderTarget, activeMipmapLevel } = this;

  if (this.coordinateSystem !== renderer.coordinateSystem) {
    this.coordinateSystem = renderer.coordinateSystem;
    this.updateCoordinateSystem();
  }

  const [cameraPX, cameraNX, cameraPY, cameraNY, cameraPZ, cameraNZ] = this
    .children as THREE.PerspectiveCamera[];

  const currentRenderTarget = renderer.getRenderTarget();
  const currentActiveCubeFace = renderer.getActiveCubeFace();
  const currentActiveMipmapLevel = renderer.getActiveMipmapLevel();
  const currentXrEnabled = renderer.xr.enabled;

  renderer.xr.enabled = false;

  const generateMipmaps = renderTarget.texture.generateMipmaps;
  renderTarget.texture.generateMipmaps = false;

  renderer.setRenderTarget(renderTarget, 0, activeMipmapLevel);
  renderer.clear();
  renderer.render(scene, cameraPX);
  onAfterFaceRender?.(0, renderTarget, cameraPX);

  renderer.setRenderTarget(renderTarget, 1, activeMipmapLevel);
  renderer.clear();
  renderer.render(scene, cameraNX);
  onAfterFaceRender?.(1, renderTarget, cameraNX);

  renderer.setRenderTarget(renderTarget, 2, activeMipmapLevel);
  renderer.clear();
  renderer.render(scene, cameraPY);
  onAfterFaceRender?.(2, renderTarget, cameraPY);

  renderer.setRenderTarget(renderTarget, 3, activeMipmapLevel);
  renderer.clear();
  renderer.render(scene, cameraNY);
  onAfterFaceRender?.(3, renderTarget, cameraNY);

  renderer.setRenderTarget(renderTarget, 4, activeMipmapLevel);
  renderer.clear();
  renderer.render(scene, cameraPZ);
  onAfterFaceRender?.(4, renderTarget, cameraPZ);

  // three.js에 이렇게 써있음. 마지막 face에 mipmap 생성된다는 의미
  // mipmaps are generated during the last call of render()
  // at this point, all sides of the cube render target are defined
  renderTarget.texture.generateMipmaps = generateMipmaps;

  renderer.setRenderTarget(renderTarget, 5, activeMipmapLevel);
  renderer.clear();
  renderer.render(scene, cameraNZ);
  onAfterFaceRender?.(5, renderTarget, cameraNZ);

  renderer.setRenderTarget(
    currentRenderTarget,
    currentActiveCubeFace,
    currentActiveMipmapLevel,
  );
  renderer.xr.enabled = currentXrEnabled;
  renderTarget.texture.needsPMREMUpdate = true;
}

// 총 6개의 캔버스 리턴 : px, nx, py, ny, pz, nz
// 각 px는 큐브카메라[]의 px가 타일링 된 사진 ( row * col )
function captureAllFacesToCanvas(
  option: RenderProbePMREMOption & { cubeCameras: THREE.CubeCamera[] },
): HTMLCanvasElement[] {
  const {
    gl: renderer,
    cubeCameras,
    cubeResolution,
    scene,
    pmremResolution,
    probes,
  } = option;

  if (probes.length !== cubeCameras.length) {
    throw new Error('Probes length must match cubeCameras length');
  }

  const tileSize = cubeResolution;

  // px, nx, py, ny, pz, nz 순서로 캔버스 준비
  const faceCanvases: HTMLCanvasElement[] = [];
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = tileSize;
  tempCanvas.height = tileSize;
  const tempCtx = tempCanvas.getContext('2d')!;

  for (let face = 0; face < 6; face++) {
    const canvas = document.createElement('canvas');
    canvas.width = pmremResolution; // 4x4 타일
    canvas.height = pmremResolution;
    faceCanvases.push(canvas);
  }

  const probeCount = probes.length;
  const { cols, rows } = getProbeSize(probeCount);
  const colWidth = Math.round(pmremResolution / cols);
  const rowHeight = Math.round(pmremResolution / rows);

  // 카메라 루프
  for (let i = 0; i < probeCount; i++) {
    if (!cubeCameras[i]) continue;

    // 모든 6면 렌더
    cubeCameras[i].update = cubeCameraUpdaterWithOnAfterFaceRender;
    cubeCameras[i].update(
      renderer,
      scene,
      // @ts-ignore
      (
        faceIndex: number,
        renderTarget: THREE.WebGLRenderTarget,
        camera: THREE.PerspectiveCamera,
      ) => {
        const buffer = new Uint8Array(tileSize * tileSize * 4);

        const gl = renderer.getContext();
        gl.viewport(0, 0, tileSize, tileSize);
        gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
        gl.readPixels(
          0,
          0,
          tileSize,
          tileSize,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          buffer,
        );

        tempCtx.clearRect(0, 0, tileSize, tileSize);
        const imgData = tempCtx.createImageData(tileSize, tileSize);
        imgData.data.set(buffer);
        tempCtx.putImageData(imgData, 0, 0);

        // face 캔버스에 붙이기
        // 이 때 colWidth * rowHeight로 리사이징됨
        const faceCtx = faceCanvases[faceIndex].getContext('2d')!;
        faceCtx.imageSmoothingEnabled = true;
        faceCtx.imageSmoothingQuality = 'high';

        const dx = (i % cols) * colWidth;
        const dy = ((i / cols) | 0) * rowHeight; // |0 = 정수 캐스팅

        const offset = 0;
        // faceCtx.drawImage(
        //   tempCanvas,
        //   -0.5,
        //   -0.5,
        //   tileSize + 1,
        //   tileSize + 1,
        //   dx,
        //   dy,
        //   colWidth,
        //   rowHeight,
        // );
        faceCtx.drawImage(
          tempCanvas,
          0,
          0,
          tileSize,
          tileSize,
          dx,
          dy,
          colWidth,
          rowHeight,
        );
      },
    );
  }

  return faceCanvases;
}

export function savePMREMTextureAsPNG(
  renderer: THREE.WebGLRenderer,
  pmremTarget: {
    texture: THREE.Texture;
    width: number;
    height: number;
  },
  filename = 'pmrem.png',
) {
  const pmremTexture = pmremTarget.texture;
  const w = pmremTarget.width;
  const h = pmremTarget.height;

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new THREE.Scene();

  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({ map: pmremTexture }),
  );
  scene.add(quad);

  const renderTarget = new THREE.WebGLRenderTarget(w, h);
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  // 픽셀 읽기 (RGBA, Uint8Array)
  const buffer = new Uint8Array(w * h * 4);
  renderer.readRenderTargetPixels(renderTarget, 0, 0, w, h, buffer);

  // 캔버스에 이미지 그리기
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(w, h);

  // 수직 뒤집기 (WebGL 좌표계 ↔ 캔버스 좌표계)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIndex = ((h - y - 1) * w + x) * 4;
      const dstIndex = (y * w + x) * 4;
      imageData.data.set(buffer.slice(srcIndex, srcIndex + 4), dstIndex);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // 저장
  canvas.toBlob(blob => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

function getProbeBox(
  p: ReflectionProbe | { center: THREE.Vector3; size: number },
): { center: THREE.Vector3; size: THREE.Vector3 } {
  if ((p as any).center) {
    return p as any;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  (p as ReflectionProbe).getBox().getCenter(center);
  (p as ReflectionProbe).getBox().getSize(size);

  return {
    center,
    size,
  };
}

export type RenderProbePMREMOption = {
  probes: ReflectionProbe[] | { center: THREE.Vector3; size: number }[];
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;

  // 다음 값 두 개는 다음 의미를 가짐
  // 1. 일단 cubeResolution로 cubeCamera.update()를 한다
  // 2. 그리고 pmrem을 만들 때 pmremResolution을 행/열로 나눈 사이즈에 리사이징해서 때려박는다
  cubeResolution: number; // 128 | 256 | 512 | 1024 | 2048;
  pmremResolution: number; // 128 | 256 | 512 | 1024 | 2048;
};
const defaultRenderProbeOption: Partial<RenderProbePMREMOption> = {
  pmremResolution: 1024,
  cubeResolution: 512,
};

type PartialWithRequired<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export function renderProbesToPMREM(
  option: PartialWithRequired<
    RenderProbePMREMOption,
    'probes' | 'gl' | 'scene'
  >,
): THREE.WebGLRenderTarget<THREE.Texture> {
  const mergedOption = {
    ...defaultRenderProbeOption,
    ...option,
  } as RenderProbePMREMOption & {
    cubeCameras: THREE.CubeCamera[]; // 여기서 만들어서 넣어줄 것임
  };

  const { probes, gl, scene, pmremResolution, cubeResolution } = mergedOption;

  if (probes.length === 0) {
    throw new Error('No probes to render');
  }

  // 0. 되돌릴 것들 세팅
  const prevSize = new THREE.Vector2();
  gl.getSize(prevSize);
  const prevRenderTarget = gl.getRenderTarget();
  const prevXrEnabled = gl.xr.enabled;
  const prevShadowAutoUpdate = gl.shadowMap.autoUpdate;
  gl.xr.enabled = false;
  gl.shadowMap.autoUpdate = false;

  // 1. 큐브 카메라 생성

  const cubeCameras = probes.map(p => {
    // cubeCam for env capture
    const renderTarget = new THREE.WebGLCubeRenderTarget(cubeResolution, {
      format: THREE.RGBAFormat,
      generateMipmaps: false,
    });

    const cubeCam = new THREE.CubeCamera(0.1, 1000, renderTarget);
    cubeCam.position.copy(getProbeBox(p).center);

    return cubeCam;
  });

  // 2. CubeCamera[]로부터 합쳐진 6개의 면 생성
  gl.setSize(pmremResolution, pmremResolution);

  mergedOption.cubeCameras = cubeCameras;
  const canvases = captureAllFacesToCanvas(mergedOption);

  // 디버깅용 페이스 저장
  if (true) {
    const faceNames = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
    canvases.map((canvas, i) =>
      canvas.toBlob(blob => {
        console.log('Canvas : ', i);
        saveAs(blob!, `pmrem_canvas_${faceNames[i]}.png`);
      }, 'image/png'),
    );
  }

  // 3. 캔버스들을 PMREM화 (큐브 텍스처로 변환)
  const cubeTexture = new THREE.CubeTexture(canvases);
  cubeTexture.needsUpdate = true;
  cubeTexture.needsPMREMUpdate = true;

  if (!sharedPMREMGen) {
    sharedPMREMGen = new THREE.PMREMGenerator(gl);
    sharedPMREMGen.compileCubemapShader();
  }

  gl.clear();
  const pmremRT = sharedPMREMGen.fromCubemap(cubeTexture);

  // savePMREMTextureAsPNG(renderer, pmremRT, 'pmrem_result.png');

  // 4. 되돌리기
  gl.setSize(prevSize.x, prevSize.y); // 원래 크기로 되돌리기
  gl.setRenderTarget(prevRenderTarget); // 원래 렌더 타겟으로 되돌리기
  gl.xr.enabled = prevXrEnabled; // XR 상태 되돌리기
  gl.shadowMap.autoUpdate = prevShadowAutoUpdate; // 그림자 자동 업데이트 되돌리기

  return pmremRT;
}
