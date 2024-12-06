
import { useEffect } from 'react'

import { Canvas, useThree } from '@react-three/fiber';
import { useSetAtom } from 'jotai';
import { OrbitControls } from '@react-three/drei';
import { threeExportsAtom } from '../../scripts/atoms';
import EnvironmentMap from '../canvas/EnvironmentMap';
import GlobalContrast from '../canvas/GlobalContrast';

const Renderer = () => {
    const setThreeExports = useSetAtom(threeExportsAtom);
    const threeExports = useThree();

    useEffect(() => {
        setThreeExports(threeExports);
    }, []);

    return <>
        <OrbitControls />
        {/* <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} /> */}
    </>;
}

const MobileRenderer = () => {
    return <Canvas>
        <Renderer />
        <EnvironmentMap></EnvironmentMap>
        <GlobalContrast></GlobalContrast>
    </Canvas>
}

export default MobileRenderer;