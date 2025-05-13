import MaxPageRightBar from 'src/pages/max/MaxPageRightBar.tsx';
import { useRef, useState } from 'react';
import MaxPageMain from 'src/pages/max/MaxPageMain.tsx';
import MaxPageBelowController from 'src/pages/max/MaxPageBelowController.tsx';
import useMaxFileManager from 'src/pages/max/UseMaxFileController.ts';
import * as THREE from 'VTHREE';
import MaterialPanelContainer from 'src/components/MaterialPanel.tsx';
import Modal from 'src/components/Modal.tsx';
import MeshInfoPanel from 'src/components/MeshInfoPanel.tsx';

const MaxPage = () => {
  const [rightBarExpanded, setRightBarExpanded] = useState(true);
  const { handleDrop, handleDragOver, handleDragLeave, isDragging } =
    useMaxFileManager();

  const [scene, setScene] = useState<THREE.Scene>();

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
