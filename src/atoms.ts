import type { RootState } from "@react-three/fiber";
import { atom } from "jotai";
import { THREE } from "./VTHREE";

export const sourceAtom = atom<{ name: string; url: string; file: File }[]>([]);
export const loadHistoryAtom = atom<Map<string, { name: string; start: number; end: number; file: File, uuid: string; }>>(new Map());
export const threeExportsAtom = atom<RootState>();

export type Env = {
    select: "none" | "preset" | "custom";
    preset?: "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "studio" | "sunset" | "warehouse";
    url?: string;
    intensity?:number;
};
export const envAtom = atom<Env>({ select: "none" });
export const cameraAtom = atom<THREE.Matrix4>();