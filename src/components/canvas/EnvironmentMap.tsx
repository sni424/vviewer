import { Environment } from "@react-three/drei";
import { __UNDEFINED__ } from "../../Constants";
import { useAtomValue } from "jotai";
import { envAtom } from "../../scripts/atoms";

function MyEnvironment() {
    const env = useAtomValue(envAtom);
    if (env.select === "none") {
        return null;
    }

    const intensity = env.intensity ?? 1;

    if (env.select === "preset") {
        return <Environment preset={env.preset ?? "apartment"} environmentIntensity={intensity} />
    }

    if (env.select === "custom" || env.select === "url") {
        if (!env.url || env.url === __UNDEFINED__) {
            return null;
        }
        return <Environment files={env.url} environmentIntensity={intensity} />
    }
}

export default MyEnvironment;