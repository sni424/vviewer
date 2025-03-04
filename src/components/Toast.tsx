import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import { ToastAtom } from '../scripts/atoms.ts';

export const Toast = () => {
  const toastRef = useRef<HTMLDivElement>(null);
  const { on, message } = useAtomValue(ToastAtom);

  useEffect(() => {
    const toast = toastRef.current;
    if (toast) {
      if (on) {
        toast.style.display = 'block';
        setTimeout(() => {
          toast.style.opacity = '1';
        }, 16);
      } else {
        toast.style.opacity = '0';
        setTimeout(() => {
          toast.style.display = 'none';
        }, 500);
      }
    }
  }, [on]);

  return (
    <div
      ref={toastRef}
      className="absolute z-[100] bottom-[16px] right-[32px] transition-opacity duration-500 bg-[#0000FFAA] text-white text-sm rounded p-3 min-w-[200px] text-center"
    >
      {message}
    </div>
  );
};
