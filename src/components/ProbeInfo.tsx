import { useAtom, useAtomValue } from 'jotai';
import { orbitControlsAtom, ProbeAtom, showProbeAtom, threeExportsAtom } from '../scripts/atoms.ts';
import ReflectionProbe from '../scripts/ReflectionProbe.ts';
import './probe.css';
import React, { useEffect, useState } from 'react';
import { v4 } from 'uuid';

const ProbeInfo = () => {
    const threeExports = useAtomValue(threeExportsAtom);
    const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);
    const orbitControls = useAtomValue(orbitControlsAtom);
    
    
    if (!threeExports) {
        return null;
    }
    
    const { scene, gl, camera } = threeExports;
    
    function addProbe() {
        const probe = new ReflectionProbe(gl, scene, camera, orbitControls);
        probe.addToScene();
        setProbes(prev => [...prev, probe]);
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
                {
                    probes.map((probe, idx) => {
                        
                        return (
                            <ProbeComponent probe={probe} key={idx} />
                        );
                    })
                }
            </section>
        </div>
    );
};

export const ProbeComponent = ({ probe }: { probe: ReflectionProbe }) => {
    const threeExports = useAtomValue(threeExportsAtom);
    const orbitControls = useAtomValue(orbitControlsAtom);
    const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);
    const [showProbe, setShowProbe] = useState<boolean>(probe.getShowProbe());
    const [showControls, setShowControls] = useState<boolean>(probe.getShowControls());
    
    if (!threeExports || !orbitControls) {
        return (
            <div style={{ width: '100%' }}>
                <p style={{ textAlign: 'center' }}>아직 Three.js 정보나 OrbitControls 정보가 init 되지 않았습니다.</p>
            </div>
        );
    }
    const { scene, gl, camera } = threeExports;
    
    useEffect(() => {
        const mesh = probe.getBoxMesh();
        mesh.visible = showProbe;
        
        if (!showProbe) {
            if (showControls) {
                setShowControls(showProbe);
            }
        }
        
        probe.setShowProbe(showProbe);
    }, [showProbe]);
    
    useEffect(() => {
        probe.setShowControls(showControls);
    }, [showControls]);
    
    function deleteProbe(probe: ReflectionProbe) {
        probe.removeFromScene();
        setProbes(prev => prev.filter(p => p.getId() !== probe.getId()));
    }
    
    function copyProbe() {
        const json = probe.toJSON();
        json.id = v4();
        json.center[0] = json.center[0] + 1;
        json.center[2] = json.center[2] + 1;
        const newProbe = new ReflectionProbe(gl, scene, camera, orbitControls).fromJSON(json);
        newProbe.addToScene();
        setProbes((prev) => [...prev, newProbe]);
        console.log(scene);
    }
    
    return (
        <div className="probe-document">
            <div className="probe">
                <span className={`probeId`}>프로브 #{probes.findIndex(p => p.getId() === probe.getId()) + 1}</span>
                <span className="probeId" style={{ fontSize: 10, marginLeft: '4px'}}>{probe.getId()}</span>
                <button className="deleteButton" onClick={() => deleteProbe(probe)}>x</button>
            </div>
            <div className="probe">
                <div style={{ fontSize: 11, paddingLeft: 4, display: 'flex', alignItems: 'center' }}>
                    <span>프로브 보기</span>
                    <input className="on-off" type="checkbox" checked={showProbe} onChange={(e) => {
                        setShowProbe(e.target.checked);
                    }} />
                </div>
                <div style={{ fontSize: 11, paddingLeft: 4, display: 'flex', alignItems: 'center' }}>
                    <span>컨트롤 보기</span>
                    <input className="on-off" type="checkbox" checked={showControls} onChange={(e) => {
                        setShowControls(e.target.checked);
                    }} />
                </div>
            </div>
            <div className="probe">
                <button style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
                        onClick={() => probe.updateCameraPosition(probe.getBoxMesh().position)}>업데이트
                </button>
                <button style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer', marginLeft: '4px' }}
                        onClick={copyProbe}>복제
                </button>
            </div>
            <div className="probe-detail">
            
            </div>
        </div>
    );
};

export default ProbeInfo;