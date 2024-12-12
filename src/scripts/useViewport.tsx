import { useAtom, useAtomValue } from "jotai";
import { View } from "../types";
import { sharedThreeAtom, Threes } from "./atoms";
import { Canvas, CanvasProps, RootState, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useCallback, useEffect, useMemo } from "react";

export const useThreeAtom = (view: View) => {
    const [threeValue, setThree] = useAtom(Threes[view]);
    const sharedThreeValue = useAtomValue(sharedThreeAtom);
    return {
        sharedThreeValue,
        threeValue,
        setThree
    }
}

export type ViewportProps = {
    children?: React.ReactNode,
    onCreated?: CanvasProps["onCreated"],
    rest?: Omit<CanvasProps, "onCreated">
}

const MainViewportRenderer = () => {
    const exports = useThree();
    const { setThree } = useThreeAtom(View.Shared);
    useEffect(() => {
        console.log("main set called")
        setThree(exports);
    }, []);

    // useFrame(()=>{
    //     console.log("Main cam:", exports.camera.uuid);
    // })

    return <></>
}

const MainViewport = ({ children, onCreated, ...rest }: ViewportProps) => {
    const view = View.Shared;

    return (
        <Canvas {...rest}>
            <MainViewportRenderer></MainViewportRenderer>
            {children}
        </Canvas>
    );
}

const CameraDistance = 300;

export const DefaultCameraPositions: { [key in View]: { position: [number, number, number]; zoom: number } } = {
    [View.Shared]: {
        position: [CameraDistance, CameraDistance, CameraDistance],
        zoom: 20
    },
    [View.Main]: {
        position: [CameraDistance, CameraDistance, CameraDistance],
        zoom: 20
    },
    [View.Top]: {
        position: [0, CameraDistance, 0],
        zoom: 20
    },

    [View.Front]: {
        position: [0, 0, CameraDistance],
        zoom: 20
    },

    [View.Right]: {
        position: [CameraDistance, 0, 0],
        zoom: 20
    },

    [View.Left]: {
        position: [-CameraDistance, 0, 0],
        zoom: 20
    },

    [View.Back]: {
        position: [0, 0, -CameraDistance],
        zoom: 20
    },

    [View.Bottom]: {
        position: [0, -CameraDistance, 0],
        zoom: 20
    }

} as const;

const SubViewport = (view: View) => {
    // const LocalRenderer = () => {
    //     const _localExports = useThree();
    //     const [threeExports, setThreeExports] = useAtom(_threeExportsAtom);
    //     useEffect(() => {
    //         if (!threeExports[view]) {
    //             setThreeExports(prev => ({ ...prev, [view]: _localExports }));
    //         }
    //     }, [threeExports[view]])
    //     // useFrame(() => {
    //     //     const { camera } = _localExports;
    //     //     console.log(camera.type, camera.uuid)
    //     // });
    //     return <></>
    // }
    const Viewport = ({ children, onCreated, ...rest }: ViewportProps) => {
        const { sharedThreeValue } = useThreeAtom(view);
        // const myExports = getExports(view);
        const sharedExports = sharedThreeValue;
        if (!sharedExports) {
            return null;
        }

        const { position, zoom } = DefaultCameraPositions[view];

        return (
            <Canvas scene={sharedExports.scene} onCreated={rootState => {
                // if (!myExports) {
                //     // setExports(rootState, view);
                //     console.log("failed:", view);
                // }

                // const { camera } = rootState;
                // // console.log(view, camera);
                // camera.layers.enable(View.Shared);
                // camera.layers.enable(view);

                // return onCreated?.(rootState);

            }} {...rest}>
                {/* <OrthographicCamera makeDefault position={position} zoom={zoom} /> */}
                {/* <OrthographicCamera makeDefault /> */}
                {/* <OrbitControls enableRotate={!false}></OrbitControls> */}
                {/* <LocalRenderer view={view} /> */}
                {children}
            </Canvas>
        );
    }
    return Viewport;
}

export default function useViewport(view: View = View.Shared) {
    // console.log("drawing")
    // const { threeExports } = useThreeExports(view);
    // const mainSceneExports = getExports(View.Shared);
    // const thisSceneExports = getExports(view);

    let Viewport: React.FC<ViewportProps>;

    if (view === View.Shared) {
        Viewport = MainViewport;
    } else {
        Viewport = SubViewport(view);
    }

    // if (view === View.Front && thisSceneExports) {
    //     console.log("FV", thisSceneExports.camera.uuid);
    // }

    return {
        Viewport,
        // mainSceneExports,
        // sceneExports: thisSceneExports
    }
}