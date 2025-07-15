import { gsap } from 'gsap';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { Layer } from 'src/Constants.ts';
import { MaxConstants } from 'src/pages/max/loaders/MaxConstants.ts';
import { callObject, MaxCallObject } from 'src/pages/max/loaders/MaxUtils.ts';
import VROLoader from 'src/pages/max/loaders/VROLoader.ts';
import { ProbeAtom, threeExportsAtom } from 'src/scripts/atoms.ts';
import VTextureLoader from 'src/scripts/loaders/VTextureLoader.ts';
import ReflectionProbe from 'src/scripts/ReflectionProbe.ts';
import * as THREE from 'VTHREE';

const MaxFreezeSub = () => {
  const threeExports = useAtomValue(threeExportsAtom);

  const [init, setInit] = useState(false);
  const objectRef = useRef<MaxCallObject | null>(null);
  const tempSceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);
  const [statusMessage, setStatusMessage] = useState('시작 전');
  const [objectLoaded, setObjectLoaded] = useState(false);
  const [sceneAdded, setSceneAdded] = useState(false);
  const [showDP, setShowDP] = useState(true);
  const [dpOnLightMaps, setDPOnLightMaps] = useState<{
    [key: string]: THREE.Texture;
  }>({});
  const [dpOFFLightMaps, setDPOFFLightMaps] = useState<{
    [key: string]: THREE.Texture;
  }>({});

  useEffect(() => {
    if (init && sceneAdded && objectRef.current) {
      const { scene } = threeExports!!;
      const timeLines: gsap.core.Timeline[] = [];
      scene.traverse(o => {
        if (o.type === 'Mesh') {
          const timeLine = gsap.timeline().pause();
          const mesh = o as THREE.Mesh;
          const mat = (o as THREE.Mesh).matPhysical;
          if (objectRef.current?.dp.includes(mesh.name)) {
            const transparency = mat.transparent;
            timeLine.to(
              { progress: 0 },
              {
                progress: 1,
                duration: 1.5,
                onStart() {
                  mat.apply('meshTransition', {
                    direction: showDP ? 'fadeIn' : 'fadeOut',
                  });
                  mesh.visible = true;
                  mat.transparent = true;
                },
                onUpdate() {
                  const progressValue = this.targets()[0].progress;
                  mat.progress = progressValue;
                },
                onComplete() {
                  mesh.visible = showDP;
                  mat.remove('meshTransition');
                  mat.transparent = transparency;
                },
              },
            );
            timeLines.push(timeLine);
          } else if (
            mesh.vUserData.lightmapLayer?.includes('layer') ||
            mesh.vUserData.lightmapLayer?.includes('op')
          ) {
            const key = mesh.vUserData.lightmapLayer?.includes('op')
              ? 'option_lg'
              : mesh.vUserData.lightmapLayer;
            const targetLightmap = showDP
              ? dpOnLightMaps[key]
              : dpOFFLightMaps[key];
            targetLightmap.flipY = true;
            targetLightmap.needsUpdate = true;
            console.log(mesh.vUserData.lightmapLayer, targetLightmap, showDP);
            timeLine.to(
              { progress: 0 },
              {
                progress: 1,
                duration: 1.5,
                onStart() {
                  mat.uniform.uLightMapTo.value = targetLightmap;
                  mat.uniform.uUseLightMapTransition.value = true;
                  mat.progress = 0;
                  mat.needsUpdate = true;
                },
                onUpdate() {
                  const progressValue = this.targets()[0].progress;
                  mat.progress = progressValue;
                },
                onComplete() {
                  mat.lightMap = targetLightmap;
                  mat.uniform.uUseLightMapTransition.value = false;
                  mat.needsUpdate = true;
                },
              },
            );
            timeLines.push(timeLine);
          }
        }
      });

      timeLines.forEach(timeLine => {
        timeLine.play(0);
      });
    }
  }, [showDP]);

  function toggleDP() {
    if (init && sceneAdded) {
      setShowDP(pre => !pre);
    }
  }

  async function loadObjects() {
    if (objectRef.current) {
      const paths = objectRef.current.paths;
      const loader = new VROLoader();
      let completed = 0;

      const loadedObjects: THREE.Object3D[] = [];

      setStatusMessage(`Object 불러오는 중.. (${completed} / ${paths.length})`);

      await Promise.all(
        paths.map(async (path, index) => {
          const object = await loader.loadFromFileName(path);
          object.layers.enable(Layer.Model);
          loadedObjects[index] = object;
          completed++;
          setStatusMessage(
            `Object 불러오는 중.. (${completed} / ${paths.length})`,
          );
        }),
      );

      tempSceneRef.current.add(...loadedObjects);
      setStatusMessage('불러오기 완료');
      setObjectLoaded(true);

      await loadLightMaps();

      console.log('after added to Scene : ', tempSceneRef.current);
    } else {
      alert('아직 준비되지 않았습니다.');
    }
  }

  useEffect(() => {
    if (threeExports && !init) {
      initialize();
    }
  }, [threeExports]);

  async function initialize() {
    const objects = await callObject();
    console.log('init', objects);
    objectRef.current = objects;
    setInit(true);
  }

  async function createProbes() {
    if (threeExports) {
      const { scene, gl, camera } = threeExports;
      // 먼저 기존 프로브 제거

      if (probes.length > 0) {
        probes.forEach(p => p.removeFromScene());
        setProbes([]);
      }

      const coordsAndSizes: {
        name: string;
        position: { x: number; y: number; z: number };
        size: { x: number; y: number; z: number };
      }[] = [
        {
          name: '거실',
          position: { x: -754.938, y: 1189.94, z: 1400.82 },
          size: { x: 4459.44, y: 3020.0, z: 4564.66 },
        },
        {
          name: '복도1',
          position: { x: -4035.2, y: 0.0, z: -400.591 },
          size: { x: 2160.68, y: 3020.0, z: 1059.1 },
        },
        {
          name: '욕실1',
          position: { x: -3879.14, y: 0.0, z: -1814.74 },
          size: { x: 2200.0, y: 3020.0, z: 1500.0 },
        },
        {
          name: '욕실2',
          position: { x: 5212.89, y: 1189.94, z: -586.161 },
          size: { x: 2300.0, y: 3020.0, z: 1500.0 },
        },
        {
          name: '욕실2 앞',
          position: { x: 3512.89, y: 1189.94, z: -386.161 },
          size: { x: 1000.0, y: 3020.0, z: 1300.0 },
        },
        {
          name: '주방',
          position: { x: -200.52, y: 0.0, z: -2790.591 },
          size: { x: 3165.5, y: 3020.0, z: 3749.49 },
        },
        {
          name: '침실1',
          position: { x: 3412.89, y: 1189.94, z: 2023.88 },
          size: { x: 3479.8, y: 3020.0, z: 3349.0 },
        },
        {
          name: '침실2',
          position: { x: -5005.0, y: 1189.94, z: 2023.88 },
          size: { x: 3500.0, y: 3020.0, z: 3349.0 },
        },
        {
          name: '침실3',
          position: { x: 2840.92, y: 1189.94, z: -2870.43 },
          size: { x: 2392.0, y: 3020.0, z: 3584.0 },
        },
        {
          name: '현관',
          position: { x: -5746.3, y: 0.0, z: -1234.74 },
          size: { x: 1158.46, y: 3020.0, z: 2748.96 },
        },
      ];

      const newProbes = coordsAndSizes.map(c => {
        const probe = new ReflectionProbe(gl, scene, camera);
        const json = probe.toJSON();
        probe.fromJSON(json);
        const position = new THREE.Vector3(
          c.position.x,
          c.position.y,
          c.position.z,
        ).multiplyScalar(1 / 1000);
        const scale = new THREE.Vector3(
          c.size.x,
          c.size.y,
          c.size.z,
        ).multiplyScalar(1 / 1000);
        position.setY(1.2);
        scale.setY(3.2);
        probe.setName(c.name);
        probe.setCenterAndSize(position, scale);
        probe.getBoxMesh().visible = false;
        probe.setShowControls(false);
        probe.setShowProbe(true);
        // probe.getBoxMesh().visible = true;
        probe.addToScene(true);
        return probe;
      });

      setProbes(newProbes);

      applyProbe(newProbes);
    }
  }

  async function loadLightMaps() {
    if (!objectRef.current) {
      alert('아직 준비되지 않았습니다.');
      return;
    }
    const url = MaxConstants.base + 'lightmaps/0715/';
    const VR_0715_LIGHT_MAPS = [
      'dp01',
      'dp02',
      'layer001',
      'layer002',
      'layer003',
      'layer004',
      'option_lg',
    ];
    const DPON_LIGHTMAP_SUFFIX = '_dpon.hdr';
    const DPOFF_LIGHTMAP_SUFFIX = '_dpoff.hdr';

    const awaitedDPON = await Promise.all(
      VR_0715_LIGHT_MAPS.map(async uri => {
        const tex = await VTextureLoader.loadAsync(
          url + uri + DPON_LIGHTMAP_SUFFIX,
          threeExports,
        );
        tex.flipY = uri.endsWith('hdr');
        tex.needsUpdate = true;
        return [uri, tex]; // [key, value] 형태로 반환
      }),
    );

    const awaitedDPOff = await Promise.all(
      VR_0715_LIGHT_MAPS.filter(d => !d.includes('dp')).map(async uri => {
        const tex = await VTextureLoader.loadAsync(
          url + uri + DPOFF_LIGHTMAP_SUFFIX,
          threeExports,
        );
        tex.flipY = uri.endsWith('hdr');
        tex.needsUpdate = true;
        return [uri, tex]; // [key, value] 형태로 반환
      }),
    );

    const dpOnTextures: { [key: string]: THREE.Texture } =
      Object.fromEntries(awaitedDPON);

    const dpOffTextures: { [key: string]: THREE.Texture } =
      Object.fromEntries(awaitedDPOff);

    applyLightMap(dpOnTextures);

    setDPOnLightMaps(dpOnTextures);
    setDPOFFLightMaps(dpOffTextures);
  }

  function applyLightMap(textures: { [key: string]: THREE.Texture }) {
    const lightMapApplies = objectRef.current!!.sectionMapping;

    console.log('applyLightMap', textures);
    const keys = Object.keys(lightMapApplies);
    tempSceneRef.current.traverseAll(o => {
      if (o.type === 'Mesh') {
        const mesh = o as THREE.Mesh;

        if (keys.includes(mesh.name)) {
          const layerName = extractQName(lightMapApplies[mesh.name]);
          if (layerName) {
            mesh.vUserData.lightmapLayer = layerName;
          }
        } else if (keys.includes(stripMatSuffix(mesh.name))) {
          const formattedKey = stripMatSuffix(mesh.name);
          const layerName = extractQName(lightMapApplies[formattedKey]);
          if (layerName) {
            mesh.vUserData.lightmapLayer = layerName;
          }
        }

        // 이미 넣었으면 패스
        if (!mesh.matPhysical.lightMap) {
          if (keys.includes(mesh.name)) {
            let targetLightMapKey: string;
            if (mesh.name === 'Sphere034') {
              const matName = mesh.matPhysical.name;
              if (matName.includes('암막커튼')) {
                targetLightMapKey = 'dp01';
              } else {
                targetLightMapKey = 'dp02';
              }
            } else {
              targetLightMapKey = lightMapApplies[mesh.name] as string;
            }
            if (targetLightMapKey.startsWith('fi_')) {
              let key = extractQName(targetLightMapKey);
              console.log(key, targetLightMapKey);

              if (key) {
                const mat = mesh.matPhysical;
                if (key.includes('op')) {
                  key = 'option_lg';
                }
                mat.lightMap = textures[key];
                if (!mat.lightMap.flipY) {
                  mat.lightMap.flipY = true;
                }
                mat.lightMapIntensity = 2;
                mat.vUserData.viz4dLightMap = key;
                mat.needsUpdate = true;
              }
            }
          } else if (keys.includes(stripMatSuffix(mesh.name))) {
            const formattedKey = stripMatSuffix(mesh.name);
            const targetLightMapKey: string = lightMapApplies[
              formattedKey
            ] as string;
            if (targetLightMapKey.startsWith('fi_')) {
              let key = extractQName(targetLightMapKey);
              if (key) {
                if (key.includes('op')) {
                  key = 'option_lg';
                }
                const mat = mesh.matPhysical;
                mat.lightMap = textures[key];
                if (!mat.lightMap.flipY) {
                  mat.lightMap.flipY = true;
                }
                mat.lightMapIntensity = 2;
                mat.vUserData.viz4dLightMap = key;
                mat.needsUpdate = true;
              }
            }
          }
        }
      }
    });
  }

  async function addToScene() {
    const { scene } = threeExports!!;
    scene.add(...tempSceneRef.current.children);
    setSceneAdded(true);
  }

  function hasProbe(material: THREE.Material) {
    return material.vUserData.probeIds && material.vUserData.probeType;
  }

  function renderProbe(paramProbes?: ReflectionProbe[]) {
    const { scene } = threeExports!!;
    let ps = paramProbes ? paramProbes : probes;
    ps.forEach(p => {
      p.renderCamera(true);
    });
    const probeApplyInfo = objectRef.current!!.probeApplyInfo;

    const keys = Object.keys(probeApplyInfo);
    const realKeys = Object.fromEntries(
      keys.map(key => {
        const idx = key.lastIndexOf('_');
        const prefix = idx !== -1 ? key.substring(0, idx) : key;
        return [prefix, key];
      }),
    );

    const rkKeys = Object.keys(realKeys);

    scene.traverseAll(o => {
      if (o.type === 'Mesh') {
        const mat = (o as THREE.Mesh).matPhysical;
        if (keys.includes(mat.name)) {
          const names = probeApplyInfo[mat.name].probeNames;
          const filtered = ps.filter(p => {
            return names.includes(p.getName());
          });

          mat.apply('probe', { probes: filtered });
          mat.needsUpdate = true;
        } else {
          const lastUnderScoreIndex = mat.name.lastIndexOf('_');
          if (lastUnderScoreIndex !== -1) {
            const realName = mat.name.substring(0, lastUnderScoreIndex);
            if (rkKeys.includes(realName)) {
              if (!mat.vUserData.probeNames) {
                const names = probeApplyInfo[realKeys[realName]].probeNames;
                const filtered = ps.filter(p => {
                  return names.includes(p.getName());
                });

                mat.apply('probe', { probes: filtered });
                mat.needsUpdate = true;
              }
            }
          }
        }
      }
    });
  }

  function applyProbe(paramProbes?: ReflectionProbe[]) {
    let ps = paramProbes ? paramProbes : probes;

    if (ps.length > 0) {
      const { scene } = threeExports!!;
      const probeApplyInfo = objectRef.current!!.probeApplyInfo;

      const keys = Object.keys(probeApplyInfo);

      const realKeys = Object.fromEntries(
        keys.map(key => {
          const idx = key.lastIndexOf('_');
          const prefix = idx !== -1 ? key.substring(0, idx) : key;
          return [prefix, key];
        }),
      );

      const rkKeys = Object.keys(realKeys);

      scene.traverseAll(o => {
        if (o.type === 'Mesh') {
          const mat = (o as THREE.Mesh).matPhysical;
          if (keys.includes(mat.name)) {
            if (!mat.vUserData.probeNames) {
              const names = probeApplyInfo[mat.name].probeNames;
              const filtered = ps.filter(p => {
                return names.includes(p.getName());
              });

              mat.apply('probe', { probes: filtered });
              mat.needsUpdate = true;
            }
          } else {
            const lastUnderScoreIndex = mat.name.lastIndexOf('_');
            if (lastUnderScoreIndex !== -1) {
              const realName = mat.name.substring(0, lastUnderScoreIndex);
              if (rkKeys.includes(realName)) {
                if (!mat.vUserData.probeNames) {
                  const names = probeApplyInfo[realKeys[realName]].probeNames;
                  const filtered = ps.filter(p => {
                    return names.includes(p.getName());
                  });

                  mat.apply('probe', { probes: filtered });
                  mat.needsUpdate = true;
                }
              }
            }
          }
        }
      });

      for (let i = 0; i < 3; i++) {
        renderProbe(ps);
      }

      setStatusMessage('완료');
    }
  }

  async function oneClick() {
    await loadObjects();
    await addToScene();
    setStatusMessage('프로브 생성 및 적용 중..');
    await createProbes();
    applyProbe();
  }

  function extractQName(str: string) {
    const match = str.match(/fi_([a-zA-Z0-9_]+)/i);
    return match ? match[1] : null;
  }

  function stripMatSuffix(str: string) {
    if (str.indexOf('_mat_sub_') !== -1) {
      return str.replace(/_mat_sub_\d+$/, '');
    } else if (str.indexOf('_mat_id_') !== -1) {
      return str.replace(/_mat_id_\d+$/, '');
    } else {
      return str;
    }
  }

  return (
    <div className="absolute w-full h-[40px] border border-black border-b top-0 bg-white p-1">
      <div className="flex gap-x-1">
        <span>{statusMessage}</span>
        <button onClick={oneClick}>one Click</button>
        <button
          className="p-1 text-[12px]"
          disabled={objectRef.current === undefined || objectLoaded}
          onClick={loadObjects}
        >
          load Objects
        </button>
        <button disabled={!objectLoaded || sceneAdded} onClick={addToScene}>
          View 에 추가
        </button>
        <button onClick={createProbes}>프로브 생성</button>
        <button onClick={() => renderProbe()}>render Probe</button>
        <button onClick={toggleDP}>dp toggle (분류 미완성)</button>
      </div>
    </div>
  );
};

export default MaxFreezeSub;
