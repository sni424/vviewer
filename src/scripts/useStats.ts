import { useFrame } from "@react-three/fiber";
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

        return () => {
            if (statsRef.current) {
                statsRef.current.dom.remove();
            }
            statsRef.current = null;
        }
    }, []);

    useFrame(() => {
        if (statsRef.current) {
            statsRef.current.update();
        }
    });
}

export default useStats;