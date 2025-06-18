import MaxPageRightBar from 'src/pages/max/MaxPageRightBar.tsx';
import React, { useEffect, useRef, useState } from 'react';
import MaxPageMain from 'src/pages/max/MaxPageMain.tsx';
import MaxPageBelowController from 'src/pages/max/MaxPageBelowController.tsx';
import useMaxFileManager from 'src/pages/max/UseMaxFileController.ts';
import * as THREE from 'VTHREE';
import MaterialPanelContainer from 'src/components/MaterialPanel.tsx';
import Modal from 'src/components/Modal.tsx';
import MeshInfoPanel from 'src/components/MeshInfoPanel.tsx';
import {
  cameraSettingAtom,
  getAtomValue,
  lastCameraInfoAtom,
  panelTabAtom,
  threeExportsAtom,
} from 'src/scripts/atoms.ts';
import { useAtom, useAtomValue } from 'jotai';

const MaxPage = () => {
  const [rightBarExpanded, setRightBarExpanded] = useState(true);
  const { handleDrop, handleDragOver, handleDragLeave, isDragging } =
    useMaxFileManager();

  const [scene, setScene] = useState<THREE.Scene>();

  // const lastSpace = React.useRef(0);
  // const posYRef = React.useRef(0);
  // const [cameraSetting, setCameraSetting] = useAtom(cameraSettingAtom);
  // const threeExports = useAtomValue(threeExportsAtom);
  // const [lastCameraInfo, setLastCameraInfo] = useAtom(lastCameraInfoAtom);

  // useEffect(() => {
  //   // space 입력 시 카메라 상승
  //   const handleKeydown = (e: KeyboardEvent) => {
  //     console.log(e);
  //     const activeElement = document.activeElement;
  //     if (activeElement) {
  //       const isInputFocused =
  //         activeElement.tagName === 'INPUT' ||
  //         activeElement.tagName === 'TEXTAREA';
  //
  //       if (isInputFocused) {
  //         return; // 이벤트 핸들링 종료
  //       }
  //     }
  //     if (getAtomValue(panelTabAtom) === 'hotspot') {
  //       return;
  //     }
  //
  //     // 카메라 y값 상승
  //     const velocity = 0.1;
  //     if (e.code === 'Space') {
  //       console.log('space');
  //       e.preventDefault();
  //       const tooSoon = Date.now() - lastSpace.current < 16;
  //       if (tooSoon) {
  //         return;
  //       }
  //       lastSpace.current = Date.now();
  //       const newY = Number((posYRef.current + velocity).toFixed(2));
  //
  //       setCameraSetting(pre => ({
  //         ...pre,
  //         cameraY: Number((pre.cameraY + newY).toFixed(2)),
  //       }));
  //     }
  //
  //     if (e.code === 'KeyC') {
  //       if (e.ctrlKey) {
  //         return;
  //       }
  //       e.preventDefault();
  //       const tooSoon = Date.now() - lastSpace.current < 16;
  //       if (tooSoon) {
  //         return;
  //       }
  //       lastSpace.current = Date.now();
  //       const newY = Number((posYRef.current - velocity).toFixed(2));
  //
  //       setCameraSetting(pre => ({
  //         ...pre,
  //         cameraY: Number((pre.cameraY + newY).toFixed(2)),
  //       }));
  //     }
  //   };
  //
  //   window.addEventListener('keydown', handleKeydown);
  //   return () => {
  //     window.removeEventListener('keydown', handleKeydown);
  //   };
  // }, []);
  //
  // useEffect(() => {
  //   if (!threeExports) {
  //     return;
  //   }
  //   const { camera, scene, gl } = threeExports;
  //
  //   camera.position.y = cameraSetting.cameraY;
  //   camera.updateProjectionMatrix();
  //   setLastCameraInfo(pre => ({
  //     ...pre,
  //     matrix: camera.matrix.toArray(),
  //   }));
  // }, [cameraSetting.cameraY, threeExports]); // cameraY 값만 감지

  return (
    <div
      className="w-[100vw] max-w-[100vw] text-sm overflow-x-hidden h-[100vh] relative overflow-y-hidden"
      style={{ border: isDragging ? '2px black dashed' : 'none' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* MAIN DIV */}
      <MaxPageMain setScene={setScene}/>
      {/* RIGHT BAR */}
      <MaxPageRightBar
        scene={scene}
        expanded={rightBarExpanded}
        setExpanded={setRightBarExpanded}
      />
      <MaxPageBelowController />
      <MaterialPanelContainer></MaterialPanelContainer>
      <Modal></Modal>
      <MeshInfoPanel></MeshInfoPanel>
    </div>
  );
};

export default MaxPage;
