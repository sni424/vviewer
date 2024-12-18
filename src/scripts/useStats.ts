import { useEffect, useRef } from 'react';
import Stats from 'stats.js';

const useStats = (on: boolean = true) => {
  const statsRef = useRef<Stats | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!on) {
      if (frameRef.current !== 0) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      statsRef.current?.dom.remove();
      statsRef.current = null;
      return;
    }

    if (!statsRef.current) {
      statsRef.current = new Stats();
    }
    // document.body.append(statsRef.current.domElement);
    document.body.append(statsRef.current.dom);

    const animate = () => {
      if (statsRef.current) {
        statsRef.current.update();
      }
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (statsRef.current) {
        statsRef.current.dom.remove();
      }
      statsRef.current = null;

      cancelAnimationFrame(frameRef.current);
    };
  }, [on]);
};

export default useStats;
