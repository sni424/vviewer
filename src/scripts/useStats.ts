import { useEffect, useRef } from 'react';

export type StatPerSecond = {
  at: number;
  framerate: number;
  highestMemoryUsage: number;
}

export type VStats = {
  start: number;
  end: number;
  elapsed: number;
  baseMemory: {
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
  stats: StatPerSecond[]
  maxFrameRate: number;
  averageFramerate: number;
  lowest1percentFramerate: number;
  highestMemoryUsage: number;
}

const MAX_STATS = 300;
function useFramerate(on: boolean, interval: number = 1000) {
  const startRef = useRef(Date.now());
  const animRef = useRef<number>(0);
  const stats = useRef<StatPerSecond[]>([]); // [at, framerate][];
  const statInThisSecond = useRef<{
    at: number;
    framerate: number;
    highestMemoryUsage: number;
  }>({
    at: Date.now(),
    framerate: 0,
    highestMemoryUsage: 0
  });
  const memoryBaseInfoRef = useRef<{
    totalJSHeapSize: number,
    jsHeapSizeLimit: number
  }>();

  const cleanup = () => {
    if (animRef.current !== 0) {
      cancelAnimationFrame(animRef.current);
    }
  }

  useEffect(() => {
    if (!on) {
      return cleanup;
    }

    const perf = window.performance as {
      memory?: {
        totalJSHeapSize: number,
        usedJSHeapSize: number,
        jsHeapSizeLimit: number
      }
    }
    const memory = perf.memory;
    if (!memory) {
      console.warn('Memory API not available @ useFramerate');
      return;
    }

    memoryBaseInfoRef.current = {
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };

    const loop = () => {
      const memory = perf.memory!;
      animRef.current = requestAnimationFrame(loop);

      // get framerate
      const now = Date.now();
      const elapsed = now - statInThisSecond.current.at;
      if (elapsed < interval) {
        statInThisSecond.current.framerate++;
        statInThisSecond.current.highestMemoryUsage = Math.max(
          statInThisSecond.current.highestMemoryUsage,
          memory.totalJSHeapSize
        );
      } else {
        stats.current.push({
          at: statInThisSecond.current.at,
          framerate: statInThisSecond.current.framerate * (1000 / interval),
          highestMemoryUsage: statInThisSecond.current.highestMemoryUsage
        });
        // console.log(memory.totalJSHeapSize, memory.usedJSHeapSize, memory.jsHeapSizeLimit);
        statInThisSecond.current = {
          at: now,
          framerate: 0,
          highestMemoryUsage: 0
        }

        if (stats.current.length > MAX_STATS) {
          stats.current.shift();
        }
      }
    }

    loop();

    return cleanup
  }, [on]);

  const getStats: () => VStats = () => {
    const end = Date.now();
    const elapsed = end - startRef.current;
    const baseMemory = memoryBaseInfoRef.current ?? null;
    const averageFramerate = stats.current.reduce((acc, cur) => acc + cur.framerate, 0) / stats.current.length;
    const sortedFramerates = stats.current.map(stat => stat.framerate).sort((a, b) => a - b);
    const lowest1percentFramerate = sortedFramerates[Math.floor(sortedFramerates.length * 0.01)];
    const highestMemoryUsage = stats.current.reduce((acc, cur) => Math.max(acc, cur.highestMemoryUsage), 0);
    const maxFrameRate = stats.current.reduce((acc, cur) => Math.max(acc, cur.framerate), 0);

    const retval: VStats = {
      start: startRef.current,
      end,
      elapsed,
      baseMemory,
      stats: stats.current,
      averageFramerate,
      lowest1percentFramerate,
      highestMemoryUsage,
      maxFrameRate
    }
    return retval;
  };

  return getStats;
}

export default useFramerate;