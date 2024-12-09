import * as THREE from './VTHREE.ts';
import { v4 } from 'uuid';
import { OrbitControls, TransformControls } from 'three-stdlib';

const DEFAULT_RESOLUTION: ReflectionProbeResolutions = 256;
const DEFAULT_POSITION: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
const DEFAULT_SIZE: THREE.Vector3 = new THREE.Vector3(4, 4, 4);
const REFLECTION_BOX_LAYER = 5;
const CUBE_CAMERA_LAYER = 10;

export type ReflectionProbeResolutions = 256 | 512 | 1024 | 2048;

export default class ReflectionProbe {
    // SCENE PROPERTIES
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene: THREE.Scene;
    private readonly orbitControls: OrbitControls;
    // RENDER PROPERTIES
    private pmremGenerator: THREE.PMREMGenerator;
    private readonly renderTarget: THREE.WebGLCubeRenderTarget;
    private cubeCamera: THREE.CubeCamera;
    private cubeCameraNear: number = 0.1; // CubeCamera Near
    private cubeCameraFar: number = 1000; // CubeCamera 의 Far
    private resolution: ReflectionProbeResolutions = DEFAULT_RESOLUTION; // CubeTexture 해상도
    // RENDER MEASURES
    private center: THREE.Vector3 = DEFAULT_POSITION;
    private size: THREE.Vector3 = DEFAULT_SIZE;
    private readonly box: THREE.Box3 = new THREE.Box3().setFromCenterAndSize(this.center, this.size);
    // RESULT OBJECTS
    private boxMesh: THREE.Mesh;
    private reflectionProbeSphere: THREE.Mesh;
    private effectedMeshes: THREE.Mesh[] = [];
    private readonly translateControls: TransformControls<THREE.Camera>;
    private readonly scaleControls: TransformControls<THREE.Camera>;
    // PRIORITY PROPERTIES
    private readonly serializedId: string = v4();
    
    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, orbitControls?: OrbitControls, resolution?: ReflectionProbeResolutions) {
        this.renderer = renderer;
        this.pmremGenerator = new THREE.PMREMGenerator(renderer);
        this.scene = scene;
        this.orbitControls = orbitControls;
        
        if (!camera.layers.isEnabled(CUBE_CAMERA_LAYER)) {
            camera.layers.enableAll();
            camera.layers.enable(CUBE_CAMERA_LAYER);
        }
        
        if (resolution) {
            this.resolution = resolution;
        }
        
        this.renderTarget = new THREE.WebGLCubeRenderTarget(this.resolution, {
            format: THREE.RGBFormat,
            generateMipmaps: false,
        });
        
        // Create Cube Camera
        const cubeCamera = new THREE.CubeCamera(this.cubeCameraNear, this.cubeCameraFar, this.renderTarget);
        cubeCamera.layers.enableAll();
        cubeCamera.layers.disable(REFLECTION_BOX_LAYER);
        cubeCamera.update(this.renderer, this.scene);
        
        // Create Sphere Mesh
        const sphereMesh = createProbeSphere(cubeCamera);
        sphereMesh.scale.set(1 / this.size.x, 1 / this.size.y, 1 / this.size.z);
        sphereMesh.material.envMap = this.getTexture();
        sphereMesh.userData.probe = this;
        
        const boxMesh = createMeshFromBox(this.box, this.serializedId);
        boxMesh.add(sphereMesh);
        
        const translateControls = new TransformControls(camera, this.renderer.domElement);
        const scaleControls = new TransformControls(camera, this.renderer.domElement);
        scaleControls.setMode('scale');
        scaleControls.setSize(0.5);
        
        translateControls.addEventListener('dragging-changed', (event) => {
            if (orbitControls) {
                orbitControls.enabled = !event.value;
            }
        });
        
        scaleControls.addEventListener('dragging-changed', (event) => {
            if (orbitControls) {
                orbitControls.enabled = !event.value;
            }
        })
        
        
        translateControls.addEventListener('change', (event) => {
            if (this.boxMesh) {
                this.updateCameraPosition(this.boxMesh.position);
            }
        });
        
        scaleControls.addEventListener('change', (event) => {
            if (this.boxMesh) {
                this.reflectionProbeSphere.scale.set(1 / this.boxMesh.scale.x, 1 / this.boxMesh.scale.y, 1 / this.boxMesh.scale.z);
                this.updateCameraPosition(this.boxMesh.position);
            }
        })
        
        translateControls.attach(boxMesh);
        scaleControls.attach(boxMesh);
        
        this.cubeCamera = cubeCamera;
        this.reflectionProbeSphere = sphereMesh;
        this.boxMesh = boxMesh;
        this.translateControls = translateControls;
        this.scaleControls = scaleControls;
    }
    
    getControls() {
        return { translateControls: this.translateControls, scaleControls: this.scaleControls };
    }
    
    setResolution(resolution: ReflectionProbeResolutions) {
        // TODO REDNER UPDATE
        this.resolution = resolution;
    }
    
    getId() {
        return this.serializedId;
    }
    
    setFromObject(object: THREE.Object3D) {
        console.log('set From Object : ', object);
        if (object) {
            this.setCenterAndSize(getMeshCenterPosition(object), getMeshSize(object));
        } else {
            throw new Error('ReflectionProbe.setFromObject() : Object Must Be Not null or undefined : ' + object);
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
    
    updateBox() {
        this.box.setFromCenterAndSize(this.center, this.size);
        this.boxMesh.position.copy(this.center);
        this.boxMesh.scale.copy(this.size);
    }
    
    updateSphere() {
        this.reflectionProbeSphere.scale.set(1 / this.size.x, 1 / this.size.y, 1 / this.size.z);
        this.updateCameraPosition(this.center);
    }
    
    getBoxMesh() {
        this.updateObjectChildrenEnv();
        return this.boxMesh;
    }
    
    resetEffectedMeshes() {
        // 기존 Probe에 엮인 메시의 envMap 초기화
        this.effectedMeshes.forEach(mesh => {
            const material = mesh.material;
            if ('envMap' in material) {
                mesh.material.envMap = null;
            }
        });
    }
    
    updateObjectChildrenEnv() {
        // 기존 Probe 에 엮인 메시 모두 적용 해제
        this.resetEffectedMeshes();
        
        // 적용될 메시 찾기
        const box = createBoxByCenterAndSize(this.cubeCamera.position, this.boxMesh.scale);
        const meshInBox: THREE.Mesh[] = [];
        const tempBox = new THREE.Box3();
        this.scene.traverse((child) => {
            if (child.type === 'Mesh' && !child.userData.isProbeMesh && !isTransformControlsChild(child)) {
                const meshBox = tempBox.setFromObject(child);
                if (box.intersectsBox(meshBox)) {
                    child.userData.probe = this;
                    meshInBox.push(child as THREE.Mesh);
                }
            }
        });
        
        
        // envMap 적용
        const envMap = this.getTexture();
        meshInBox.forEach(mesh => {
            const mat = mesh.material as THREE.Material;
            if (!('onBeforeCompileTemp' in mat)) {
                mat['onBeforeCompileTemp'] = mat.onBeforeCompile;
            }
            mat.onBeforeCompile = materialOnBeforeCompileFunction(this.cubeCamera.position, this.boxMesh.scale);
            mat.envMap = envMap;
            mat.envMapIntensity = 1;
        });
        return this;
    }
    
    onBeforeCubeCameraUpdate() {
        const scene = this.scene;
        const transformControls = scene.children.filter(child => {
            return child.isTransformControls;
        });
        
        transformControls.forEach(child => {
            child.visible = false;
        });
        
        return transformControls;
    }
    
    onAfterCubeCameraUpdate(transformControls: THREE.Object3D[]) {
        transformControls.forEach(child => {
            child.visible = true;
        });
    }
    
    renderCamera() {
        // Before render
        const transformControls = this.onBeforeCubeCameraUpdate();
        this.cubeCamera.update(this.renderer, this.scene);
        this.reflectionProbeSphere.material.envMap = this.getTexture();
        this.updateObjectChildrenEnv();
        this.onAfterCubeCameraUpdate(transformControls);
    }
    
    updateCameraPosition(position: THREE.Vector3) {
        this.cubeCamera.position.copy(position);
        this.renderCamera();
        return this;
    }
    
    getTexture() {
        const cubeTexture = this.renderTarget.texture;
        return this.pmremGenerator.fromCubemap(cubeTexture).texture;
    }
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
    
    const mesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    // Set Mesh Layer not to detected on CubeCamera
    mesh.layers.set(REFLECTION_BOX_LAYER);
    mesh.userData.isProbeMesh = true;
    mesh.userData.probeId = serializedId;
    mesh.position.copy(center);
    mesh.scale.copy(size);
    
    const meshBox = new THREE.Box3();
    meshBox.setFromCenterAndSize(center, new THREE.Vector3(1, 1, 1));
    
    const boxHelper = new THREE.Box3Helper(meshBox, '#00deff');
    boxHelper.layers.set(REFLECTION_BOX_LAYER);
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

function createProbeSphere(cubeCamera: THREE.CubeCamera) {
    const geometry = new THREE.SphereGeometry(0.5, 32, 16);
    
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1,
        roughness: 0,
        envMapIntensity: 1.0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isProbeMesh = true;
    mesh.userData.followingCameraUuid = cubeCamera.uuid;
    return mesh;
}

const worldPosReplace = /* glsl */`
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
    vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );

    #ifdef BOX_PROJECTED_ENV_MAP
        vWorldPosition = worldPosition.xyz;
    #endif
#endif
`;

const boxProjectDefinitions = /*glsl */`
#ifdef BOX_PROJECTED_ENV_MAP
    uniform vec3 envMapSize;
    uniform vec3 envMapPosition;
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
        
        return boxIntersection - cubePos;
    }
#endif
`;

// will be inserted after "vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );"
const getIBLIrradiance_patch = /* glsl */`
#ifdef BOX_PROJECTED_ENV_MAP
    worldNormal = parallaxCorrectNormal( worldNormal, envMapSize, envMapPosition );
#endif
`;

// will be inserted after "reflectVec = inverseTransformDirection( reflectVec, viewMatrix );"
const getIBLRadiance_patch = /* glsl */`
#ifdef BOX_PROJECTED_ENV_MAP
    reflectVec = parallaxCorrectNormal( reflectVec, envMapSize, envMapPosition );
#endif
`;

const materialOnBeforeCompileFunction = (pos: THREE.Vector3, size: THREE.Vector3) => {
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
        useBoxProjectedEnvMap(shader, pos, size);
    };
};

function useBoxProjectedEnvMap(shader: THREE.WebGLProgramParametersWithUniforms, envMapPosition: THREE.Vector3, envMapSize: THREE.Vector3) {
    // defines
    shader.defines.BOX_PROJECTED_ENV_MAP = true;
    
    // uniforms
    shader.uniforms.envMapPosition = {
        value: envMapPosition,
    };
    
    shader.uniforms.envMapSize = {
        value: envMapSize,
    };
    
    // vertex shader
    shader.vertexShader = 'varying vec3 vWorldPosition;\n' + shader.vertexShader
        .replace(
            '#include <worldpos_vertex>',
            worldPosReplace,
        );
    
    // fragment shader
    shader.fragmentShader = boxProjectDefinitions + '\n' + shader.fragmentShader
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