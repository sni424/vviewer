import React, { SetStateAction, useState } from 'react';

const TONEMAPPING_RESOLUTIONS = [4, 8, 16, 64, 128, 256, 512, 1024] as const;

type ToneMappingResolutions = (typeof TONEMAPPING_RESOLUTIONS)[number];

type useToneMappingR = {
  adaptive: boolean;
  resolution: ToneMappingResolutions;
  middleGrey: number;
  maxLuminance: number;
  averageLuminance: number;
  adaptationRate: number;
  setAdaptive: React.Dispatch<SetStateAction<boolean>>;
  setResolution: React.Dispatch<SetStateAction<ToneMappingResolutions>>;
  setMiddleGrey: React.Dispatch<SetStateAction<number>>;
  setMaxLuminance: React.Dispatch<SetStateAction<number>>;
  setAverageLuminance: React.Dispatch<SetStateAction<number>>;
  setAdaptationRate: React.Dispatch<SetStateAction<number>>;
};

export function useToneMapping(): useToneMappingR {
  const [adaptive, setAdaptive] = useState<boolean>(false);
  const [resolution, setResolution] = useState<ToneMappingResolutions>(512);
  const [middleGrey, setMiddleGrey] = useState<number>(0.6);
  const [maxLuminance, setMaxLuminance] = useState<number>(16);
  const [averageLuminance, setAverageLuminance] = useState<number>(1);
  const [adaptationRate, setAdaptationRate] = useState<number>(1);

  return {
    adaptive,
    resolution,
    middleGrey,
    maxLuminance,
    averageLuminance,
    adaptationRate,
    setAdaptive,
    setResolution,
    setMiddleGrey,
    setMaxLuminance,
    setAverageLuminance,
    setAdaptationRate,
  };

  // const ToneMappingComponent = () => (
  //   <ToneMapping
  //     adaptive={adaptive}
  //     resolution={resolution}
  //     middleGrey={middleGrey}
  //     maxLuminance={maxLuminance}
  //     averageLuminance={averageLuminance}
  //     adaptationRate={adaptationRate}
  //   />
  // );
  //
  // const InputComponents = () => (
  //   <div>
  //     <div>
  //       <strong>ToneMapping</strong>
  //       <input
  //         type="checkbox"
  //         checked={adaptive}
  //         onChange={e => {
  //           setAdaptive(e.target.checked);
  //         }}
  //       />
  //     </div>
  //     {adaptive && (
  //       <div style={{ paddingLeft: 8 }}>
  //         <div>
  //           <span style={{ fontSize: 12 }}>
  //             MiddleGrey : {middleGreyRef.current}
  //           </span>
  //           <input
  //             style={{
  //               width: '100%',
  //             }}
  //             type="range"
  //             min={0}
  //             max={1}
  //             step={0.01}
  //             // value={middleGrey}
  //             defaultValue={middleGreyRef.current}
  //             onInput={e => {
  //               const value = parseFloat(e.target.value);
  //               middleGreyRef.current = value;
  //               setMiddleGrey(value);
  //             }}
  //           />
  //         </div>
  //       </div>
  //     )}
  //   </div>
  // );
  //
  // return {
  //   ToneMappingComponent,
  //   InputComponents,
  // };
}
