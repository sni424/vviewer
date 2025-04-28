import MaxPageRightBar from 'src/pages/max/MaxPageRightBar.tsx';
import { useState } from 'react';
import MaxPageMain from 'src/pages/max/MaxPageMain.tsx';
import MaxPageBelowController from 'src/pages/max/MaxPageBelowController.tsx';
import useMaxFileManager from 'src/pages/max/UseMaxFileController.ts';

const MaxPage = () => {
  const [rightBarExpanded, setRightBarExpanded] = useState(true);
  const { handleDrop, handleDragOver, handleDragLeave, isDragging } =
    useMaxFileManager();


  return (
    <div
      className="w-[100vw] max-w-[100vw] overflow-x-hidden h-[100vh] relative"
      style={{border: isDragging ? '2px black dashed' : 'none'}}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* MAIN DIV */}
      <MaxPageMain />
      {/* RIGHT BAR */}
      <MaxPageRightBar
        expanded={rightBarExpanded}
        setExpanded={setRightBarExpanded}
      />
      <MaxPageBelowController />
    </div>
  );
};

export default MaxPage;
