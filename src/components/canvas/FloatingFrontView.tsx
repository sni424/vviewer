import React, { useMemo, useState } from 'react'
import { ViewController, Viewport } from './Viewport';
import { View } from '../../types';



function FloatingFrontView({
    children
}: {
    children?: React.ReactNode
}) {
    const view = View.Front;
    const TheCanvas = Viewport(view);
    const TopViewController = ViewController(view);
    const [show, setShow] = useState(false);
    const hide = () => setShow(false);

    return <>
        {!show && <button onClick={() => {
            setShow(true);
        }}>정면 보기</button>}

        {
            show && <div className='relative w-[200px] h-[200px] bg-[#f6f6f6]' style={{
                border: "1px solid #3f3f3f",
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

export default FloatingFrontView