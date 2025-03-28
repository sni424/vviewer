import { useRef } from 'react';

// Define the const object with 'as const' for literal types
const OPTIONS = {
  dp: ['on', 'off'],
  alpha: ['on', 'off'],
  beta: ['high', 'low', 'medium'], // Expandable: add more properties or values
} as const;

// Type alias for the OPTIONS structure
type OptionsType = typeof OPTIONS;
const OPTION_KEYS = Object.keys(OPTIONS) as (keyof OptionsType)[];
type OptionKey = (typeof OPTION_KEYS)[number];

// Utility type to generate all combinations
type Combinations<T> = {
  -readonly [K in keyof T]: T[K] extends ReadonlyArray<infer V> ? V : never;
} extends infer O
  ? { [K in keyof O]: O[K] }
  : never;

// Derived type (all combinations)
type Option = Combinations<OptionsType>;

class OptionManager {
  curOption: Option;

  constructor() {
    this.curOption = {} as Option;

    for (const _key in OPTIONS) {
      const key = _key as OptionKey;
      this.curOption[key] = OPTIONS[key][0];
    }
  }
}
function ShaderTestPanel() {
  const mgrRef = useRef(new OptionManager());
  const mgr = mgrRef.current;

  return (
    <div>
      ShaderTestPanel
      <div>
        {Object.entries(mgr.curOption).map(([key, value]) => {
          return (
            <div key={key}>
              {key}: {value}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ShaderTestPanel;
