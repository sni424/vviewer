import { useAtomValue } from 'jotai';
import { animationDurationAtom } from '../scripts/atoms.ts';
import { string } from 'three/src/nodes/tsl/TSLCore';

const ImageTransitionComponent = ({
  idx,
  sources,
}: {
  idx: number;
  sources: string[];
}) => {
  const animationDuration = useAtomValue(animationDurationAtom);

  return (
    <div className="relative w-full h-full">
      {sources.map((source, index) => (
        <img
          key={'minimap-image-' + index}
          className="absolute transition-opacity"
          style={{
            opacity: idx === index ? 1 : 0,
            transitionDuration: animationDuration * 1000 + 'ms',
          }}
          src={source}
          alt=""
        />
      ))}
    </div>
  );
};

export default ImageTransitionComponent;
