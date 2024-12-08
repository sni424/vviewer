import { useEffect, useRef } from "react";
import Stats from "stats.js";

const useStats = () => {
    const statsRef = useRef<Stats | null>(null);
    useEffect(() => {
        if (!statsRef.current) {
            statsRef.current = new Stats();
        }
        // document.body.append(statsRef.current.domElement);
        document.body.append(statsRef.current.dom);

        let frame = 0;
        const animate = () => {
            if (statsRef.current) {
                statsRef.current.update();
            }
            frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);

        return () => {
            if (statsRef.current) {
                statsRef.current.dom.remove();
            }
            statsRef.current = null;

            cancelAnimationFrame(frame);
        }
    }, []);
}

export default useStats;