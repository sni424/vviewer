import { useState } from 'react';
import { toNthDigit } from '../../scripts/utils';

const testData = [
  [0.0, 0.0, 0.0],
  [0.1, 0.1, 0.1],
  [0.2, 0.2, 0.2],
  [0.3, 0.3, 0.3],
  [0.8, 0.3, 0.6],
  [0.67, 0.3, 0.9],
  // and some more random colors :
  [0.99, 0.81, 0.41],
  [0.99, 0.22, 0.82],

  [0.0, 0.3, 0.3],
  [0.4, 0.4, 0.4],
  [0.5, 0.5, 0.5],
  [0.6, 0.6, 0.6],
  [0.7, 0.7, 0.7],
  [0.72, 0.72, 0.72],
  [0.73, 0.73, 0.73],
  [0.1, 0.5, 0.2],
  [0.2, 0.6, 0.3],
  [0.3, 0.7, 0.4],
  [0.1, 0.8, 0.1],
  [0.2, 0.9, 0.2],
  [0.7, 0.0, 0.3],
  [0.9, 0.1, 0.1],
  [0.1, 0.9, 0.1],
  [0.1, 0.1, 0.9],
  [0.1, 0.1, 0.9],
  [0.2, 0.2, 0.8],
  [0.3, 0.3, 0.7],
  [0.4, 0.4, 0.6],
  [0.5, 0.5, 0.5],
  [0.6, 0.6, 0.4],
  [0.7, 0.7, 0.3],
  [0.8, 0.8, 0.2],
  [0.9, 0.9, 0.1],
  [0.9, 0.9, 0.3],
  [0.9, 0.9, 0.5],
  [0.9, 0.9, 0.7],
  [0.4, 0.8, 0.73],
  [0.8, 0.8, 0.8],
  [0.9, 0.9, 0.9],
  [0.5, 0.9, 0.6],
  [1.0, 1.0, 1.0],
];
const v = {
  gammaFactor: 2.2,
  contrast: 1.0,
  standard: 0.5,
  k: 1.8,
  r: 0.0,
};

const Slider = ({
  label,
  update,
  min = -1,
  max = 3.0,
}: {
  label: keyof typeof v;
  update?: Function;
  min?: number;
  max?: number;
}) => {
  const [value, setValue] = useState(v[label]);
  return (
    <div>
      <label
        style={{
          textTransform: 'capitalize',
          width: 110,
          display: 'inline-block',
        }}
      >
        {label}
      </label>
      <button
        onClick={() => {
          setValue(v[label]);
        }}
      >
        초기화
      </button>
      <input
        type="range"
        min={min}
        max={max}
        step={(max - min) * 0.001}
        value={value}
        onChange={e => {
          setValue(parseFloat(e.target.value));
          v[label] = parseFloat(e.target.value);
          update?.();
        }}
      />
      {/* <span>{value}</span> */}
      <input
        type="number"
        value={value}
        onChange={e => {
          setValue(parseFloat(e.target.value));
          v[label] = parseFloat(e.target.value);
          update?.();
        }}
        step={(max - min) * 0.001}
        style={{
          width: '60px',
        }}
      ></input>
    </div>
  );
};

function ContrastTest() {
  const [_, _update] = useState(0);
  const update = () => _update(prev => prev + 1);

  const graphWidth = 400;
  const linearData = Array.from(
    { length: graphWidth },
    (_, index) => index / graphWidth,
  );

  const luminance = (color: number[]) => {
    const corrected = color.map(value => Math.pow(value, v.gammaFactor));
    return (
      corrected[0] * 0.2126 + corrected[1] * 0.7152 + corrected[2] * 0.0722
    );
  };
  const S_k_t = (intensity: number, k: number, t: number, r: number) => {
    const x_exp = Math.pow(intensity, t);
    const term = x_exp - 1.0;
    const denominatorInv = 1.0 / (1.0 + Math.pow(term, k));
    return (1.0 - r) * denominatorInv + r;
  };

  const adjustContrast = (color: number[]) => {
    const gammaFactor = v.gammaFactor;
    const standard = v.standard;
    const t = Math.log(2.0) / Math.log(standard);
    const k = v.k;
    const r = v.r;

    const corrected = color.map(value => Math.pow(value, gammaFactor));
    // const inputColor = color;
    const inputColor = corrected;
    const intensity =
      inputColor[0] * 0.2126 + inputColor[1] * 0.7152 + inputColor[2] * 0.0722;
    const adjustedIntensity = S_k_t(intensity, k, t, r);
    const reflectance = inputColor.map(value => value / (intensity + 0.0001));
    const reflectanceAdjusted = reflectance.map(
      value => (value - standard) * v.contrast + standard,
    );
    const adjustedColor = reflectanceAdjusted.map(
      value => value * adjustedIntensity,
    );
    const adjustedColorGamma = adjustedColor.map(value =>
      Math.pow(value, 1.0 / gammaFactor),
    );

    return adjustedColorGamma;
  };

  const adjustContrast2 = (color: number[]) => {
    const gammaFactor = v.gammaFactor;
    const standard = v.standard;
    const t = Math.log(2.0) / Math.log(standard);
    const k = v.k;
    const r = v.r;

    const correctGamma = (vals: number[], gamma: number) =>
      vals.map(value => Math.pow(value, gamma));

    const corrected = correctGamma(color, gammaFactor);
    const intensity =
      corrected[0] * 0.2126 + corrected[1] * 0.7152 + corrected[2] * 0.0722;
    const adjustedIntensity = S_k_t(intensity, k, t, r);
    const luminanceCorrection = adjustedIntensity / intensity;
    // corrected.map()
    return color.map(v => v * luminanceCorrection);

    // return adjustedColorGamma;
  };

  testData.sort((l, r) => luminance(l) - luminance(r));

  return (
    <div>
      <strong>ContrastTest</strong>
      <div className="w-full grid grid-cols-3 mb-5">
        <div className="w-full">
          <Slider label="gammaFactor" update={update}></Slider>
          <Slider
            label="standard"
            update={update}
            min={0.1}
            max={0.99}
          ></Slider>
          <Slider label="k" update={update}></Slider>
          {/* <Slider label="r" update={update}></Slider> */}
        </div>
        <div>
          <strong>Graph</strong>
          <div>
            <div
              style={{
                width: graphWidth,
                height: graphWidth,
                borderBottom: '1px solid black',
                borderLeft: '1px solid black',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              {linearData.map((val, i) => (
                <div
                  key={`linear-${i}`}
                  style={{
                    position: 'absolute',
                    left: i,
                    // bottom: graphWidth * 0.5,
                    bottom: i,
                    width: 1,
                    height: 1,
                    backgroundColor: 'black',
                    boxSizing: 'border-box',
                  }}
                ></div>
              ))}
              {linearData.map((val, i) => (
                <div
                  key={`adj-${i}`}
                  style={{
                    position: 'absolute',
                    left: i,
                    bottom: adjustContrast([val, val, val])[0] * graphWidth,
                    width: 1,
                    height: 1,
                    backgroundColor: 'red',
                    boxSizing: 'border-box',
                  }}
                ></div>
              ))}

              {linearData.map((val, i) => (
                <div
                  key={`adj-${i}`}
                  style={{
                    position: 'absolute',
                    left: i,
                    bottom:
                      S_k_t(
                        val,
                        v.k,
                        Math.log(2.0) / Math.log(v.standard),
                        v.r,
                      ) * graphWidth,
                    width: 1,
                    height: 1,
                    backgroundColor: 'gray',
                    boxSizing: 'border-box',
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <strong>대비 적용 전/후</strong>
          <div className="grid grid-cols-2 h-full">
            <ul className="w-full flex flex-col">
              {Array.from({ length: graphWidth }).map((_, i) => {
                const bgColor = (255 * (i + 0.5)) / graphWidth;
                return (
                  <li
                    className={`w-full flex-1`}
                    style={{
                      backgroundColor: `rgba(${bgColor}, ${bgColor}, ${bgColor}, 1)`,
                    }}
                    key={`org-color-${i}`}
                  ></li>
                );
              })}
            </ul>
            <ul className="w-full flex flex-col">
              {Array.from({ length: graphWidth }).map((_, i) => {
                const bgColor = (i + 0.5) / graphWidth;
                const adjusted =
                  255 *
                  adjustContrast([
                    i / graphWidth,
                    i / graphWidth,
                    i / graphWidth,
                  ])[0];
                return (
                  <li
                    className={`w-full flex-1`}
                    style={{
                      backgroundColor: `rgba(${adjusted}, ${adjusted}, ${adjusted}, 1)`,
                    }}
                    key={`org-color-${i}`}
                  ></li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div>
        <ul className="w-full grid grid-cols-3">
          {testData.map((data, index) => {
            const adjusted = adjustContrast(data);
            return (
              <li
                className="mb-3 text-xs grid grid-cols-2 w-full"
                key={index}
                style={{
                  backgroundColor: `rgb(${data[0] * 255}, ${data[1] * 255}, ${data[2] * 255})`,
                  color: luminance(data) > 0.5 ? 'black' : 'white',
                }}
              >
                <div>
                  {data[0]}, {data[1]}, {data[2]}
                </div>
                <div>원본밝기 : {toNthDigit(luminance(data), 4)}</div>
                <div
                  style={{
                    backgroundColor: `rgb(${adjusted[0] * 255}, ${adjusted[1] * 255}, ${adjusted[2] * 255})`,
                    color: luminance(adjusted) > 0.5 ? 'black' : 'white',
                  }}
                >
                  {toNthDigit(adjusted[0], 3)}, {toNthDigit(adjusted[1], 3)},{' '}
                  {toNthDigit(adjusted[2], 3)}
                </div>
                <div
                  style={{
                    backgroundColor: `rgb(${adjusted[0] * 255}, ${adjusted[1] * 255}, ${adjusted[2] * 255})`,
                    color: luminance(adjusted) > 0.5 ? 'black' : 'white',
                  }}
                >
                  수정밝기 : {toNthDigit(luminance(adjusted), 4)}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default ContrastTest;
