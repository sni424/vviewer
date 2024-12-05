import type { RootState } from "@react-three/fiber";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { THREE } from "./VTHREE";
import React from "react";
import { set } from "idb-keyval";

export const sourceAtom = atom<{ name: string; url: string; file: File }[]>([]);
export const loadHistoryAtom = atom<Map<string, { name: string; start: number; end: number; file: File, uuid: string; }>>(new Map());
export const threeExportsAtom = atom<RootState>();

export type Env = {
    select: "none" | "preset" | "custom" | "url";
    preset?: "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "studio" | "sunset" | "warehouse";
    url?: string;
    intensity?: number;
};
// export const envAtom = atom<Env>({ select: "none" });
export const envAtom = atom<Env>({ select: "none" });
export const cameraMatrixAtom = atom<THREE.Matrix4>();
export const cameraModeAtom = atom<"perspective" | "iso">("perspective");

export const selectedAtom = atom<string[]>([]);
export const forceUpdateAtom = atom<number>(0);
export const setForceUpdate = () => {
    const setForceUpdateAtom = useSetAtom(forceUpdateAtom);
    setForceUpdateAtom(prev => prev + 1);
}
export const useForceUpdate = () => {
    const value = useAtomValue(forceUpdateAtom);
}

export const materialSelectedAtom = atom<THREE.Material | null>(null);

export const modalAtom = atom<React.FC<{ closeModal?: () => any }> | null>(null);


export const useModal = () => {
    const setModal = useSetAtom(modalAtom);
    return {
        // ()=>Element instead of Element
        // openModal: (modal: React.ReactElement<{ closeModal?: () => any }>) => setModal(modal),
        openModal: (modal: React.FC<{ closeModal?: () => any }>) => setModal(modal),
        closeModal: () => setModal(null)
    };
}

export const useEnvParams = () => {
    const [env, _setEnv] = useAtom(envAtom);
    const setEnv = (param: Env | ((prev: Env) => Env)) => {
        let retval: Env = env;
        if (typeof param === "function") {
            _setEnv((prev) => {
                retval = param(prev);
                return retval;
            });
        } else {
            _setEnv(param);
            retval = param;
        }
        set("envParam", { ...retval })
    };
    return [env, setEnv] as const;
}

export const GizmoModes = ["translate", "rotate", "scale"] as const;
export type GizmoMode = typeof GizmoModes[number];
export const mouseModeAtom = atom<"select" | GizmoMode>("select");

export const globalContrastAtom = atom<{on:boolean; value:number}>({
    on: false,
    value: 0
});