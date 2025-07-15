import { useAtom, useAtomValue } from 'jotai';
import React from 'react';
import SceneInfo from '../components/SceneInfo';
import SceneTree from '../components/SceneTree';
import { loadHistoryAtom, panelTabAtom, Tab, Tabs } from '../scripts/atoms';
import HotSpotPanel from './HotspotPanel';
import IsoViewPanel from './IsoViewPanel.tsx';
import { OptionTab } from './OptionTab.tsx';
import ProbeInfo from './ProbeInfo';
import RoomPanel from './RoomPanel';
import SkyBoxPanel from './SkyBoxPanel.tsx';
import TourPanel from './TourPanel';
import WallTab from './WallTab.tsx';

const tabMap: { [key in Tab]: React.ReactNode } = {
  scene: <SceneInfo />,
  tree: <SceneTree></SceneTree>,
  probe: <ProbeInfo></ProbeInfo>,
  tour: <TourPanel></TourPanel>,
  hotspot: <HotSpotPanel></HotSpotPanel>,
  room: <RoomPanel></RoomPanel>,
  option: <OptionTab></OptionTab>,
  wall: <WallTab></WallTab>,
  skyBox: <SkyBoxPanel></SkyBoxPanel>,
  iso: <IsoViewPanel></IsoViewPanel>,
} as const;

const ThePanel = () => {
  const loadHistory = useAtomValue(loadHistoryAtom);
  const [tab, setTab] = useAtom(panelTabAtom);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        scrollBehavior: 'smooth',
      }}
    >
      <div
        // no scrollbar
        className="no-scrollbar"
        onWheel={e => {
          e.currentTarget.scrollLeft += e.deltaY * 0.1;
        }}
        style={{
          minHeight: 30,
          display: 'flex',
          flexWrap: 'wrap',
          width: '100%',

          // justifyContent: "space-between",
          // alignItems: "center",
          // display: 'grid',
          // gridTemplateColumns:

          // overflowX: 'auto',
        }}
      >
        {Tabs.map(t => {
          return (
            <button
              style={{
                height: 30,
                minWidth: 80,
                paddingLeft: 6,
                paddingRight: 6,
                borderRadius: 0,
                textTransform: 'capitalize',
                fontWeight: tab === t ? 'bold' : undefined,
                whiteSpace: 'nowrap',
              }}
              key={'tab-' + t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
        }}
      >
        {tabMap[tab]}
      </div>
    </div>
  );
};

export default ThePanel;
