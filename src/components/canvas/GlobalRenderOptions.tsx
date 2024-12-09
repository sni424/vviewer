import { useAtom } from 'jotai';
import React from 'react'
import { globalGlAtom } from '../../scripts/atoms';
import { GLProps } from '../../types';
import { THREE } from '../../scripts/VTHREE';

const useGlobalREnderOption = () => {
    const [gl, setGl] = useAtom(globalGlAtom);
    const updateGl = (key: string, value: any) => {
        setGl((prev: typeof gl) => {
            return {
                ...prev,
                [key]: value
            }
        })
    }

    return {
        gl,
        updateGl,
        setGl,
    }
};

const Checkbox = (props: { label: string; propKey: keyof GLProps, onChange?: (value: boolean) => any }) => {
    const { gl, updateGl } = useGlobalREnderOption();
    const { label, propKey, onChange } = props;
    return <div style={{ fontSize: 11, paddingLeft: 6 }}>
        <strong>{label}</strong>
        <input type='checkbox' checked={gl[propKey] as boolean | undefined} onChange={(e) => {
            updateGl(propKey, e.target.checked);
            onChange?.(e.target.checked);
        }}></input>
    </div>
};

const Range = (props: { label: string; propKey: keyof GLProps, min: number; max: number; step?: number }) => {
    const { gl, updateGl } = useGlobalREnderOption();
    const { label, propKey, min, max, step = (max - min) / 100. } = props;
    return <div style={{ fontSize: 11, paddingLeft: 6 }}>
        <strong>{label}</strong>
        <input type='range' value={gl[propKey]} min={min} max={max} step={step} onChange={(e) => {
            updateGl(propKey, e.target.value);
        }}></input>
        <span>{gl[propKey]}</span>
    </div>
}

const Dropdown = (props: { label: string; propKey: keyof GLProps, options: { name: string; value: any }[], transformer?: (value: string) => any },) => {
    const { gl, updateGl } = useGlobalREnderOption();
    const { label, propKey, options, transformer } = props;
    return <div style={{ fontSize: 11, paddingLeft: 6 }}>
        <strong>{label}</strong>
        <select value={gl[propKey]} onChange={(e) => {
            updateGl(propKey, transformer?.(e.target.value) ?? e.target.value);
        }}>
            {options.map((option) => {
                return <option key={`global-dropdown-${propKey}-${option.name}`} value={option.value}>{option.name}</option>
            })}
        </select>
    </div>
}

const ToneMappingOptions = [
    { name: "없음", value: THREE.NoToneMapping },
    { name: "리니어", value: THREE.LinearToneMapping },
    { name: "라인하르트", value: THREE.ReinhardToneMapping },
    { name: "Cineon", value: THREE.CineonToneMapping },
    { name: "ACES", value: THREE.ACESFilmicToneMapping },
    { name: "AgX", value: THREE.AgXToneMapping },
    { name: "Neutral", value: THREE.NeutralToneMapping },
    // {name:"Custom", value:THREE.CustomToneMapping},
] as { name: string; value: number }[];

const ShadowOptions = [
    { name: "없음", value: false },
    { name: "기본", value: THREE.BasicShadowMap },
]

const toFloat = (value: string) => parseFloat(value);
const toInt = (value: string) => parseInt(value);

function GlobalRenderOptions() {
    const { gl } = useGlobalREnderOption();
    // const {
    //     antialias,
    //     alpha,
    //     powerPreference,
    //     stencil,
    //     depth,
    //     logarithmicDepthBuffer,
    //     premultipliedAlpha,
    //     preserveDrawingBuffer,
    //     autoClear,
    //     autoClearColor,
    //     autoClearDepth,
    //     autoClearStencil,
    //     extensions,
    //     forceContextLoss,
    //     maxLights,
    //     physicallyCorrectLights,
    //     pixelRatio,
    //     precision,
    //     shadowMapType,
    //     toneMapping,
    //     toneMappingExposure,
    //     toneMappingWhitePoint,
    // } = gl;

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 12,
        }}>
            <strong style={{ fontSize: 13 }}>GL옵션</strong>
            <Checkbox label="안티앨리어싱" propKey="antialias" />
            <Checkbox label="Depth" propKey="depth" />
            <Checkbox label="Alpha" propKey="alpha" />
            <Checkbox label="Premultiplied Alpha" propKey="premultipliedAlpha" />
            <Checkbox label="Stencil" propKey="stencil" />
            <Checkbox label="Preserve Drawing Buffer" propKey="preserveDrawingBuffer" />
            {/* <Checkbox label="Logarithmic Depth Buffer" propKey="logarithmicDepthBuffer" /> */}
            <Dropdown label="톤매핑" propKey="toneMapping" options={ToneMappingOptions} transformer={toInt} />
            {gl.toneMapping !== THREE.NoToneMapping && <Range label="톤매핑 노출" propKey="toneMappingExposure" min={0} max={3} />}

        </div >
    )
}

export default GlobalRenderOptions