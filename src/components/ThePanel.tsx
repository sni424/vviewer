import React from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { loadHistoryAtom, panelTabAtom, Tab, Tabs } from '../scripts/atoms';
import SceneInfo from '../components/SceneInfo';
import SceneTree from '../components/SceneTree';
import HotSpotPanel from '../components/HotSpotPanel';
import ProbeInfo from './ProbeInfo';

const ThePanel = () => {
    const loadHistory = useAtomValue(loadHistoryAtom);
    const [tab, setTab] = useAtom(panelTabAtom)

    const tabMap: { [key in Tab]: React.ReactNode } = {
        scene: <SceneInfo />,
        tree: <SceneTree></SceneTree>,
        probe: <ProbeInfo></ProbeInfo>,
        hotspot: <HotSpotPanel></HotSpotPanel>

    };

    return <div style={{
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
    }}>
        <div style={{
            height: 30,
            // display: "flex",
            // justifyContent: "space-between",
            // alignItems: "center",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))", /* Equal width for each element */
            width: "100%",
        }}>
            {Tabs.map((t) => {
                return <button style={{ height: "100%", textTransform: "capitalize", borderBottom: tab === t ? "none" : undefined, fontWeight: tab === t ? "bold" : undefined }} key={"tab-" + t} onClick={() => setTab(t)}>{t}</button>
            })}
        </div>
        <div style={{
            flex: 1,
            minHeight: 0,
        }}>
            {tabMap[tab]}
        </div>
    </div>
}

export default ThePanel;