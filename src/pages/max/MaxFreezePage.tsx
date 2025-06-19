import MaxPageMain from 'src/pages/max/MaxPageMain.tsx';
import { useState } from 'react';
import * as THREE from 'VTHREE';

const MaxFreezePage = () => {
  const [scene, setScene] = useState<THREE.Scene>();
  return (
    <div className="w-[100vw] max-w-[100vw] text-sm overflow-x-hidden h-[100vh] relative overflow-y-hidden">
      <MaxPageMain setScene={setScene}/>
    </div>
  );
};

export default MaxFreezePage;
