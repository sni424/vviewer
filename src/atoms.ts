import type { RootState } from "@react-three/fiber";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { THREE } from "./VTHREE";
import React from "react";

export const sourceAtom = atom<{ name: string; url: string; file: File }[]>([]);
export const loadHistoryAtom = atom<Map<string, { name: string; start: number; end: number; file: File, uuid: string; }>>(new Map());
export const threeExportsAtom = atom<RootState>();

export type Env = {
    select: "none" | "preset" | "custom";
    preset?: "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "studio" | "sunset" | "warehouse";
    url?: string;
    intensity?: number;
};
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

export const modalAtom = atom<React.ReactElement<{ closeModal?: () => any }> | null>(null);
export const useModal = () => {
    const setModal = useSetAtom(modalAtom);
    return {
        openModal: (modal: React.ReactElement<{ closeModal?: () => any }>) => setModal(modal),
        closeModal: () => setModal(null)
    };
}
