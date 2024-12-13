import React, { useMemo, useState } from 'react'
import { ViewController, Viewport } from './Viewport';
import { View } from '../../types';



function FloatingTopView({
    children
}: {
    children?: React.ReactNode
}) {
    const view = View.Top;
    const TheCanvas = Viewport(view);
    const TopViewController = ViewController(view);
    const [show, setShow] = useState(false);
    const hide = () => setShow(false);

    return <>
        {!show && <button onClick={() => {
            setShow(true);
        }}>평면 보기</button>}

        {
            show && <div style={{
                width: 200,
                height: 200,
                border: "1px solid #3f3f3fdd",
                backgroundColor: "#f6f6f6aa",
            }}>
                <TheCanvas onCreated={state => {
                    state.camera.layers.enable(view);
                }}>
                    {children}
                </TheCanvas>
                <TopViewController hide={hide}></TopViewController>
            </div>
        }

    </>

}

export default FloatingTopView