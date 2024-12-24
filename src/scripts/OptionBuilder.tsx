import { atom, useAtom, useAtomValue } from 'jotai';

export type TransformType = 'onoff' | 'number' | 'dropdown';

export type Transformer =
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

export default function OptionBuilder<T = { [key in string]: Transformer }>(
  label: string,
  Component: React.FC,
  defaultOption: T,
) {
  const onoffableOption: T & { on: boolean } = {
    on: false,
    ...defaultOption,
  };
  const dedicatedAtom = atom<T & { on: boolean }>(onoffableOption);

  const OptionConsumer = () => {
    const value = useAtomValue(dedicatedAtom);
    if (!value.on) {
      return null;
    }

    const props = Object.entries(value).reduce(
      (prev, [key, value]) => {
        if (key === 'on') return prev;
        return { ...prev, [key]: value };
      },
      {} as { [key in keyof T]: any },
    );

    return <Component {...props}></Component>;
  };

  const OptionProvider = () => {
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
              const transformer: Transformer = value[optionKey as keyof T];
              const componentKey = `option-${label}-${optionKey}`;
              if (transformer.type === 'number') {
                return (
                  <div key={componentKey}>
                    <input
                      type="range"
                      min={transformer.min}
                      max={transformer.max}
                      step={transformer.step}
                      value={transformer.value}
                      onChange={e => {
                        setValue(prev => ({
                          ...prev,
                          [optionKey]: {
                            ...transformer,
                            value: parseFloat(e.target.value),
                          },
                        }));
                      }}
                    ></input>
                    <input
                      type="number"
                      min={transformer.min}
                      max={transformer.max}
                      step={transformer.step}
                      value={transformer.value}
                      onChange={e => {
                        setValue(prev => ({
                          ...prev,
                          [optionKey]: {
                            ...transformer,
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
    OptionConsumer,
    OptionProvider,
    atom: dedicatedAtom,
  };
}
