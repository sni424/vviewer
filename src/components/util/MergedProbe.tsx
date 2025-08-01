import * as THREE from 'VTHREE';
import { useAtomValue } from 'jotai';
import { ProbeAtom, threeExportsAtom } from 'src/scripts/atoms';
import { PMREMGenerator } from 'three';

let sharedPMREMGen: PMREMGenerator | null = null;

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
  renderer.render(scene, cameraPX);
  onAfterFaceRender?.(0, renderTarget, cameraPX);

  renderer.setRenderTarget(renderTarget, 1, activeMipmapLevel);
  renderer.render(scene, cameraNX);
  onAfterFaceRender?.(1, renderTarget, cameraNX);

  renderer.setRenderTarget(renderTarget, 2, activeMipmapLevel);
  renderer.render(scene, cameraPY);
  onAfterFaceRender?.(2, renderTarget, cameraPY);

  renderer.setRenderTarget(renderTarget, 3, activeMipmapLevel);
  renderer.render(scene, cameraNY);
  onAfterFaceRender?.(3, renderTarget, cameraNY);

  renderer.setRenderTarget(renderTarget, 4, activeMipmapLevel);
  renderer.render(scene, cameraPZ);
  onAfterFaceRender?.(4, renderTarget, cameraPZ);

  renderTarget.texture.generateMipmaps = generateMipmaps;

  renderer.setRenderTarget(renderTarget, 5, activeMipmapLevel);
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

const N = 16;

function captureAllFacesToCanvas(
  renderer: THREE.WebGLRenderer,
  cubeCameras: THREE.CubeCamera[],
  tileSize: number,
  scene: THREE.Scene,
): HTMLCanvasElement[] {
  // px, nx, py, ny, pz, nz 순서로 캔버스 준비
  const faceCanvases: HTMLCanvasElement[] = [];
  const faceContexts: CanvasRenderingContext2D[] = [];
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = tileSize;
  tempCanvas.height = tileSize;
  const tempCtx = tempCanvas.getContext('2d')!;

  for (let face = 0; face < 6; face++) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize * 4; // 4x4 타일
    canvas.height = tileSize * 4;
    faceCanvases.push(canvas);
    faceContexts.push(canvas.getContext('2d')!);
  }

  // 카메라 루프
  for (let i = 0; i < N; i++) {
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

        const imgData = tempCtx.createImageData(tileSize, tileSize);
        imgData.data.set(buffer);
        tempCtx.putImageData(imgData, 0, 0);

        // face 캔버스에 붙이기
        faceContexts[faceIndex].drawImage(
          tempCanvas,
          (i % 4) * tileSize,
          Math.floor(i / 4) * tileSize,
        );
      },
    );
  }

  return faceCanvases;
}

function savePMREMTextureAsPNG(
  renderer: THREE.WebGLRenderer,
  pmremTarget: THREE.WebGLRenderTarget<THREE.Texture>,
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

async function renderCubeCameras(
  renderer: THREE.WebGLRenderer,
  cubeCameras: THREE.CubeCamera[],
  tileSize: number,
  scene: THREE.Scene,
) {
  renderer.setSize(tileSize * 4, tileSize * 4);

  const canvases = captureAllFacesToCanvas(
    renderer,
    cubeCameras,
    tileSize,
    scene,
  );

  // 디버깅용 페이스 저장
  // if (true) {
  //   const faceNames = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
  //   canvases.map((canvas, i) =>
  //     canvas.toBlob(blob => {
  //       saveAs(blob!, `pmrem_canvas_${faceNames[i]}.png`);
  //     }, 'image/png'),
  //   );
  // }

  const cubeTexture = new THREE.CubeTexture(canvases);
  cubeTexture.needsUpdate = true;
  cubeTexture.needsPMREMUpdate = true;

  if (!sharedPMREMGen) {
    sharedPMREMGen = new PMREMGenerator(renderer);
    sharedPMREMGen.compileCubemapShader();
  }
  // renderer.clear();
  const pmremRT = sharedPMREMGen.fromCubemap(cubeTexture);

  savePMREMTextureAsPNG(renderer, pmremRT, 'pmrem_result.png');
}

export default function MergedProbe() {
  const probes = useAtomValue(ProbeAtom);
  const { gl, scene } = useAtomValue(threeExportsAtom)!;

  const handleMerge = () => {
    const faceSize = 256;

    const cubeCameras = probes
      .map(p => {
        const vec = new THREE.Vector3();
        p.getBox().getCenter(vec);

        // cubeCam for env capture
        const renderTarget = new THREE.WebGLCubeRenderTarget(faceSize, {
          format: THREE.RGBAFormat,
          generateMipmaps: false,
        });
        const cubeCam = new THREE.CubeCamera(0.1, 1000, renderTarget);
        cubeCam.position.copy(vec);

        return cubeCam;
      })
      .slice(0, 16);

    renderCubeCameras(gl, cubeCameras, faceSize, scene);
  };

  if (probes.length === 0) {
    return <button disabled>프로브 X</button>;
  }

  return <button onClick={handleMerge}>프로브 머지</button>;
}
