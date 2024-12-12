import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
    ProbeAtom,
    selectedAtom,
    threeExportsAtom,
} from '../scripts/atoms.ts';
import ReflectionProbe from '../scripts/ReflectionProbe.ts';
import './probe.css';
import React, { useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { THREE } from '../scripts/VTHREE.ts';

const ProbeInfo = () => {
    const threeExports = useAtomValue(threeExportsAtom);
    const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);
    
    if (!threeExports) {
        return null;
    }
    
    const { scene, gl, camera } = threeExports;
    
    function addProbe() {
        const probe = new ReflectionProbe(gl, scene, camera);
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
    const [probes, setProbes] = useAtom<ReflectionProbe[]>(ProbeAtom);
    const [showProbe, setShowProbe] = useState<boolean>(probe.getShowProbe());
    const [showControls, setShowControls] = useState<boolean>(probe.getShowControls());
    const setSelecteds = useSetAtom(selectedAtom);
    const [mesh, setMesh] = useState<THREE.Mesh>();
    
    useEffect(() => {
        setMesh(probe.getBoxMesh());
    }, [probe]);
    
    if (!threeExports) {
        return (
            <div style={{ width: '100%' }}>
                <p style={{ textAlign: 'center' }}>아직 Three.js 정보가 init 되지 않았습니다.</p>
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
        const newProbe = new ReflectionProbe(gl, scene, camera).fromJSON(json);
        newProbe.addToScene();
        setProbes((prev) => [...prev, newProbe]);
        console.log(scene);
    }
    
    function showEffectedMeshes() {
        const effectedMeshes = probe.getEffectedMeshes();
        const emUUIDs = effectedMeshes.map((mesh) => {
            return mesh.uuid;
        });
        setSelecteds(emUUIDs);
    }
    
    return (
        <div className="probe-document">
            <div className="probe">
                <span className={`probeId`}>프로브 #{probes.findIndex(p => p.getId() === probe.getId()) + 1}</span>
                <span className="probeId" style={{ fontSize: 10, marginLeft: '4px' }}>{probe.getId()}</span>
                <button className="deleteButton" onClick={() => deleteProbe(probe)}>x</button>
            </div>
            <div className="probe">
                <div style={{ fontSize: 11, display: 'flex', alignItems: 'center' }}>
                    <span>프로브 보기</span>
                    <input className="on-off" type="checkbox" checked={showProbe} onChange={(e) => {
                        setShowProbe(e.target.checked);
                    }} />
                </div>
                <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', marginLeft: 4 }}>
                    <span>컨트롤 보기</span>
                    <input className="on-off" type="checkbox" checked={showControls} onChange={(e) => {
                        setShowControls(e.target.checked);
                    }} />
                </div>
            </div>
            <div className="probe" style={{ marginTop: '8px' }}>
                <button style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
                        onClick={() => probe.updateCameraPosition(probe.getBoxMesh().position)}>업데이트
                </button>
                <button style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer', marginLeft: '4px' }}
                        onClick={copyProbe}>복제
                </button>
                <button style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer', marginLeft: '4px' }}
                        onClick={showEffectedMeshes}>적용된 메시 보기
                </button>
            </div>
            <div className="probe-detail">
                {
                    mesh && (
                        <ProbeMeshInfo mesh={mesh} />
                    )
                }
            </div>
        </div>
    );
};

export const ProbeMeshInfo = ({ mesh }: { mesh: THREE.Mesh }) => {
    if (!mesh) {
        return null;
    }
    
    const [positionX, setPositionX] = useState<number>(mesh.position.x);
    const [positionY, setPositionY] = useState<number>(mesh.position.y);
    const [positionZ, setPositionZ] = useState<number>(mesh.position.z);
    
    const [scaleX, setScaleX] = useState<number>(mesh.scale.x);
    const [scaleY, setScaleY] = useState<number>(mesh.scale.y);
    const [scaleZ, setScaleZ] = useState<number>(mesh.scale.z);
    
    useEffect(() => {
        document.addEventListener('probeMesh-changed', (event) => {
            // @ts-ignore
            const { uuid, type, position, scale } = event.detail;
            if (mesh.uuid === uuid) {
                if (type === 'position') {
                    setPositionX(position.x);
                    setPositionY(position.y);
                    setPositionZ(position.z);
                } else if (type === 'scale') {
                    setScaleX(scale.x);
                    setScaleY(scale.y);
                    setScaleZ(scale.z);
                }
            }
        });
        
        return () => {
            document.removeEventListener('probeMesh-changed', () => {})
        }
    }, []);
    
    function calculatePositionOffset(newScale: THREE.Vector3) {
        const originalScale = mesh.scale.clone();
        const originalPosition = mesh.position.clone();
        const positionOffset = new THREE.Vector3();
        
        const scaleDelta = new THREE.Vector3(
            newScale.x / originalScale.x,
            newScale.y / originalScale.y,
            newScale.z / originalScale.z
        )
        
        positionOffset.copy(originalPosition).multiply(scaleDelta).sub(originalPosition);
        
        mesh.scale.copy(newScale);
        mesh.position.add(positionOffset);
        
        mesh.children.forEach((child) => {
            if (child.type === 'Mesh') {
                child.scale.set(1 / newScale.x, 1 / newScale.y, 1 / newScale.z);
            }
        })
    }
    
    useEffect(() => {
        mesh.position.set(positionX, positionY, positionZ);
    }, [positionX, positionY, positionZ]);
    
    return (
        <div style={{marginTop: 8, paddingLeft: 8}}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ width: '120px', fontSize: '14px', marginRight: '8px' }}>박스 위치</span>
                <input
                    type="number"
                    step="0.01"
                    value={positionX}
                    onChange={(event) => {
                        setPositionX(Number(event.target.value));
                    }}
                    style={{
                        border: '1px solid gray',
                        padding: '2px 6px',
                        width: '50px',
                        marginLeft: '0',
                        fontSize: '12px',
                        textAlign: 'right',
                    }}
                />
                <input
                    type="number"
                    step="0.01"
                    value={positionY}
                    onChange={(event) => {
                        setPositionY(Number(event.target.value));
                    }}
                    style={{
                        border: '1px solid gray',
                        padding: '2px 0px',
                        width: '50px',
                        marginLeft: 8,
                        fontSize: '12px',
                        textAlign: 'right',
                    }}
                />
                <input
                    type="number"
                    step="0.01"
                    value={positionZ}
                    onChange={(event) => {
                        setPositionZ(Number(event.target.value));
                    }}
                    style={{
                        border: '1px solid gray',
                        padding: '2px 6px',
                        width: '50px',
                        marginLeft: 8,
                        fontSize: '12px',
                        textAlign: 'right',
                    }}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ width: '120px', fontSize: '14px', marginRight: '8px' }}>박스 크기</span>
                <input
                    type="number"
                    step="0.01"
                    value={scaleX}
                    onChange={(event) => {
                        const value = Number(event.target.value);
                        calculatePositionOffset(new THREE.Vector3(value, scaleY, scaleZ));
                        setScaleX(value)
                    }}
                    style={{
                        border: '1px solid gray',
                        padding: '2px 6px',
                        width: '50px',
                        marginLeft: '0',
                        fontSize: '12px',
                        textAlign: 'right',
                    }}
                />
                <input
                    type="number"
                    step="0.01"
                    value={scaleY}
                    onChange={(event) => {
                        const value = Number(event.target.value);
                        calculatePositionOffset(new THREE.Vector3(scaleX, value, scaleZ));
                        setScaleY(value);
                    }}
                    style={{
                        border: '1px solid gray',
                        padding: '2px 0px',
                        width: '50px',
                        marginLeft: 8,
                        fontSize: '12px',
                        textAlign: 'right',
                    }}
                />
                <input
                    type="number"
                    step="0.01"
                    value={scaleZ}
                    onChange={(event) => {
                        const value = Number(event.target.value);
                        calculatePositionOffset(new THREE.Vector3(scaleX, scaleY, value));
                        setScaleZ(value);
                    }}
                    style={{
                        border: '1px solid gray',
                        padding: '2px 6px',
                        width: '50px',
                        marginLeft: 8,
                        fontSize: '12px',
                        textAlign: 'right',
                    }}
                />
            </div>
        </div>
    
    );
};

export default ProbeInfo;