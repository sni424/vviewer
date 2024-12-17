import React, { useState } from 'react';
import { View } from '../../types';
import { Viewport, ViewportController } from './Viewport';

function FloatingTopView({ children }: { children?: React.ReactNode }) {
  const view = View.Top;
  const TheCanvas = Viewport(view);
  const TopViewController = ViewportController(view);
  const [show, setShow] = useState(false);
  const hide = () => setShow(false);

  return (
    <>
      {!show && (
        <button
          onClick={() => {
            setShow(true);
          }}
        >
          평면 보기
        </button>
      )}

      <div
        style={{
          width: show ? 200 : 0,
          height: show ? 200 : 0,
          border: '1px solid #3f3f3fdd',
          backgroundColor: '#f6f6f6aa',
        }}
      >
        <TheCanvas
          onCreated={state => {
            state.camera.layers.enable(view);
          }}
        >
          {children}
        </TheCanvas>
        <TopViewController hide={hide}></TopViewController>
      </div>
    </>
  );
}

export default FloatingTopView;
