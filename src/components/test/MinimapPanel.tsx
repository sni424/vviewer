import { useAtomValue } from 'jotai';
import { minimapAtom } from '../../scripts/atoms.ts';
import ImageTransitionComponent from '../ImageTransitionComponent.tsx';
import { useEffect } from 'react';

const MinimapPanel = () => {
  const { show, urls, useIndex } = useAtomValue(minimapAtom);

  useEffect(() => {
    console.log('index Changed : ', useIndex);
  }, [useIndex]);

  return (
    <div
      className="absolute top-0 w-[300px] h-[200px] border p-1 transition-left ease-in-out duration-300"
      style={{ left: show ? 0 : '-300px' }}
    >
      <ImageTransitionComponent idx={useIndex} sources={urls} />
    </div>
  );
};

export default MinimapPanel;
