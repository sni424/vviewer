export const EnvirontmentPresets = ["apartment",
    "city",
    "dawn",
    "forest",
    "lobby",
    "night",
    "park",
    "studio",
    "sunset",
    "warehouse",] as const;
export type EnvirontmentPresets = typeof EnvirontmentPresets[number];

export const __UNDEFINED__ = "__UNDEFINED__" as const;

export const DEFAULT_COLOR_TEMPERATURE = 6500;