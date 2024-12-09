import { useAtom, useAtomValue } from 'jotai';
import { orbitControlsAtom, ProbeAtom, showProbeAtom, threeExportsAtom } from '../scripts/atoms.ts';
import ReflectionProbe from '../scripts/ReflectionProbe.ts';
import './probe.css';

const ProbeInfo = () => {
    const threeExports = useAtomValue(threeExportsAtom);
    const [showProbe, setShowProbe] = useAtom<boolean>(showProbeAtom);
    const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);
    const orbitControls = useAtomValue(orbitControlsAtom);
    
    if (!threeExports) {
        return null;
    }
    
    const { scene, gl, camera } = threeExports;
    
    function addProbe() {
        const probe = new ReflectionProbe(gl, scene, camera, orbitControls);
        const boxMesh = probe.getBoxMesh();
        console.log(boxMesh);
        console.log(scene);
        scene.add(boxMesh);
        const controls = probe.getControls();
        scene.add(controls.translateControls, controls.scaleControls);
    }
    
    return (
        <div style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
        }}>
            <section style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <button style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }} onClick={addProbe}>+ 새 프로브 생성
                </button>
            </section>
            <section style={{ width: '100%' }}>
                <div className="probe">
                    <span className={`probeId`}>123</span>
                    <button className="deleteButton">x</button>
                </div>
            </section>
        </div>
    );
};

export default ProbeInfo;