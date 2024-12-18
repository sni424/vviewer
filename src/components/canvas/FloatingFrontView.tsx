import React, { useState } from 'react';
import { View } from '../../types';
import { Viewport, ViewportController } from './Viewport';

function FloatingFrontView({ children }: { children?: React.ReactNode }) {
  const view = View.Front;
  const TheCanvas = Viewport(view);
  const FrontViewController = ViewportController(view);
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
          정면 보기
        </button>
      )}

      <div
        style={{
          width: show ? 200 : 0,
          height: show ? 200 : 0,
          border: show ? '1px solid #3f3f3fdd' : undefined,
          backgroundColor: '#f6f6f6aa',
          position: 'relative',
        }}
      >
        <TheCanvas
          onCreated={state => {
            state.camera.layers.enable(view);
          }}
        >
          {children}
        </TheCanvas>
        {show && <FrontViewController hide={hide}></FrontViewController>}
      </div>
    </>
  );
}

export default FloatingFrontView;
