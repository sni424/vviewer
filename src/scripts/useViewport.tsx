import { useAtom } from "jotai";
import { View } from "../types";
import { _threeExportsAtom } from "./atoms";
import { Canvas, CanvasProps, RootState } from "@react-three/fiber";

export const useThreeExports = (view: View) => {
    const [threeExports, setThreeExports] = useAtom(_threeExportsAtom);
    const getExports = (_view: View = view) => {
        return threeExports[_view];
    }

    const setExports = (exports: RootState, _view: View = view) => {
        setThreeExports((prev) => {
            return {
                ...prev,
                [_view]: exports
            }
        });
    }

    return {
        getExports,
        setExports
    }
};


export default function useViewport(view: View = View.Shared) {
    const { getExports, setExports } = useThreeExports(view);
    const myExports = getExports(view);
    const mainSceneExports = getExports(View.Shared);

    if (view !== View.Shared && !mainSceneExports) {
        return null;
    }

    const scene = view !== View.Shared ? mainSceneExports!.scene : undefined;
    // if(view !== View.Shared){
        console.log(view, scene?.children);
    // }

    const Viewport = ({ children, onCreated, ...rest }: { children?: React.ReactNode, onCreated?: CanvasProps["onCreated"], rest?: Omit<CanvasProps, "onCreated"> }) => {
        return (
            <Canvas scene={scene} onCreated={rootState => {
                if (!myExports) {
                    setExports(rootState, view);
                }

                const { camera } = rootState;
                camera.layers.enable(View.Shared);
                camera.layers.enable(view);

            }} {...rest}>
                {children}
            </Canvas>
        );
    }

    return {
        threeExports: myExports,
        Viewport
    }
}