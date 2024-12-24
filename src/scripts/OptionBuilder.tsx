import { atom, useAtom, useAtomValue } from 'jotai';
import { cloneElement } from 'react';

export type OptionTransformType = 'onoff' | 'number' | 'dropdown';

export type OptionTransformer =
  | {
      label?: string;
      type: 'number';
      min?: number;
      max?: number;
      step?: number;
      value: number;
    }
  | {
      label?: string;
      type: 'onoff';
      value: boolean;
    }
  | {
      label?: string;
      type: 'dropdown';
      value: any;
      values: {
        label: string;
        value: any;
      };
    };

export default function OptionBuilder<
  T = { [key in string]: OptionTransformer },
>(label: string, node: React.ReactNode, defaultOption: T) {
  const onoffableOption: T & { on: boolean } = {
    on: false,
    ...defaultOption,
  };
  const dedicatedAtom = atom<T & { on: boolean }>(onoffableOption);

  const Component = () => {
    const value = useAtomValue(dedicatedAtom);
    if (!value.on) {
      return null;
    }

    const props = Object.entries(value).reduce(
      (prev, [key, value]) => {
        if (key === 'on') return prev;
        return { ...prev, [key]: (value as any).value };
      },
      {} as { [key in keyof T]: any },
    );

    console.log(props);
    return <>{cloneElement(node as any, props)}</>;
  };

  const Controller = () => {
    const [value, setValue] = useAtom(dedicatedAtom);
    const exceptOn = Object.keys(value).filter(key => key !== 'on');

    return (
      <div>
        <strong>{label}</strong>
        <input
          type="checkbox"
          checked={value.on}
          onChange={e => {
            setValue({ ...value, on: e.target.checked });
          }}
        ></input>
        {value.on && (
          <>
            {exceptOn.map((optionKey: string) => {
              const transformed = value[
                optionKey as keyof T
              ] as OptionTransformer;
              const componentKey = `option-${label}-${optionKey}`;

              if (transformed.type === 'number') {
                const max = transformed.max ?? 1;
                const min = transformed.min ?? max - 1;
                const step = transformed.step ?? (max - min) / 100;

                return (
                  <div key={componentKey}>
                    {transformed.label && <label>{transformed.label}</label>}
                    <button
                      onClick={() => {
                        setValue(prev => ({
                          ...prev,
                          [optionKey]: {
                            ...transformed,
                            value: (
                              defaultOption[
                                optionKey as keyof T
                              ] as OptionTransformer
                            ).value,
                          },
                        }));
                      }}
                    >
                      초기화
                    </button>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={transformed.value}
                      onChange={e => {
                        setValue(prev => ({
                          ...prev,
                          [optionKey]: {
                            ...transformed,
                            value: parseFloat(e.target.value),
                          },
                        }));
                      }}
                    ></input>
                    <input
                      type="number"
                      min={transformed.min}
                      max={transformed.max}
                      step={transformed.step}
                      value={transformed.value}
                      onChange={e => {
                        setValue(prev => ({
                          ...prev,
                          [optionKey]: {
                            ...transformed,
                            value: parseFloat(e.target.value),
                          },
                        }));
                      }}
                    ></input>
                  </div>
                );
              } else throw new Error();
              // return <div></div>;
            })}
          </>
        )}
      </div>
    );
  };

  return {
    Component,
    Controller,
    atom: dedicatedAtom,
  };
}
