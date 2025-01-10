import { useAtom, useAtomValue } from 'jotai';
import React, { useEffect } from 'react';
import { modalAtom, onModalCloseAtom, useModal } from '../scripts/atoms';

function Modal() {
  const Content = useAtomValue(modalAtom);
  const [onModalClose, setOnModalClose] = useAtom(onModalCloseAtom);
  const { closeModal } = useModal();

  useEffect(() => {
    if (!Content) {
      return;
    }
    const destroy = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onModalClose) {
          onModalClose();
          setOnModalClose(() => {});
        }
        closeModal();
      }
    };
    window.addEventListener('keydown', destroy);
    return () => {
      window.removeEventListener('keydown', destroy);
    };
  }, [Content, closeModal]);

  if (!Content) {
    return null;
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: '#00000033',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
      onClick={e => {
        e.stopPropagation();
        if (onModalClose) {
          onModalClose();
          setOnModalClose(() => {});
        }
        closeModal();
      }}
    >
      {React.cloneElement(Content as any, { closeModal })}
    </div>
  );
}

export default Modal;
