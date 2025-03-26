import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { Font, FontLoader } from 'three/examples/jsm/Addons.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import helvetiker_regular from '../../assets/helvetiker_regular.typeface.json?url';
import { cameraMatrixAtom, probeMinMaxAtom } from '../../scripts/atoms';
import { THREE } from '../../scripts/VTHREE';

const useTextGeometryFont = () => {
  const fontLoaderRef = useRef(new FontLoader());
  const [font, setFont] = useState<Font>();
  useEffect(() => {
    fontLoaderRef.current.loadAsync(helvetiker_regular).then(setFont);
  }, []);

  return font;
};

function SettingProbeMinMax() {
  const settingProbeMinMax = useAtomValue(probeMinMaxAtom);
  const cam = useAtomValue(cameraMatrixAtom);
  const font = useTextGeometryFont();
  // const fontLoaderRef = useRef(new FontLoader());
  // const font = useMemo(()=>fontLoaderRef.current.loadAsync(helvetiker_regular),[])

  if (!settingProbeMinMax || !font) {
    return;
  }

  let rotation = new THREE.Euler();
  if (cam) {
    const quaternion = new THREE.Quaternion();
    cam.decompose(new THREE.Vector3(), quaternion, new THREE.Vector3());
    rotation.setFromQuaternion(quaternion);
  }

  const { cmd, probe, point } = settingProbeMinMax;

  const { min: prevMin, max: prevMax } = probe.getBox();

  const minSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.03),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false }),
  );
  minSphere.renderOrder = 999;
  prevMin.y = 0;
  minSphere.position.copy(prevMin);

  const maxSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.03),
    new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false }),
  );
  prevMax.y = 0;
  maxSphere.renderOrder = 999;
  maxSphere.position.copy(prevMax);

  const currentSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.03),
    new THREE.MeshBasicMaterial({
      color: cmd === 'min' ? 0x00ff00 : 0xff0000,
      depthTest: false,
    }),
  );
  currentSphere.renderOrder = 999;

  if (point) {
    currentSphere.position.copy(point);
  } else {
  }

  const minText = new THREE.Mesh(
    new TextGeometry(
      `Min\nx:${prevMin.x.toFixed(2)}\nz:${prevMin.z.toFixed(2)}`,
      {
        font,
        size: 0.1,
        depth: 0.01,
      },
    ),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false }),
  );
  minText.position.copy(prevMin).add(new THREE.Vector3(0.1, 0, 0));
  minText.rotation.copy(rotation);
  minText.renderOrder = 999;

  const maxText = new THREE.Mesh(
    new TextGeometry(
      `Max\nx:${prevMax.x.toFixed(2)}\nz:${prevMax.z.toFixed(2)}`,
      {
        font,
        size: 0.1,
        depth: 0.01,
      },
    ),
    new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false }),
  );
  maxText.position.copy(prevMax).add(new THREE.Vector3(0.1, 0, 0));
  maxText.rotation.copy(rotation);
  maxText.renderOrder = 999;

  let currentText;
  if (point) {
    currentText = new THREE.Mesh(
      new TextGeometry(`x:${point.x.toFixed(2)}\nz:${point.z.toFixed(2)}`, {
        font,
        size: 0.1,
        depth: 0.01,
      }),
      new THREE.MeshBasicMaterial({
        color: cmd === 'min' ? 0x00ff00 : 0xff0000,
        depthTest: false,
      }),
    );
    currentText.position.copy(point).add(new THREE.Vector3(0.1, 0, 0));
    currentText.rotation.copy(rotation);
    currentText.renderOrder = 999;
  }

  return (
    <>
      <primitive object={minText} />
      <primitive object={maxText} />
      <primitive object={minSphere} />
      <primitive object={maxSphere} />
      {point && <primitive object={currentSphere} />}
      {currentText && <primitive object={currentText} />}
    </>
  );
}

export default SettingProbeMinMax;
