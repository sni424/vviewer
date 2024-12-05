import React, { useEffect } from 'react'
import { modalAtom, useModal } from '../scripts/atoms';
import { useAtomValue } from 'jotai';

function isClassComponent(component: any) {
    return (
        typeof component === 'function' &&
        !!component.prototype.isReactComponent
    )
}

function isFunctionComponent(component: any) {
    return (
        typeof component === 'function' &&
        String(component).includes('return React.createElement')
    )
}

function isReactComponent(component: any) {
    return (
        isClassComponent(component) ||
        isFunctionComponent(component)
    )
}


function Modal() {
    const Content = useAtomValue(modalAtom);
    const { closeModal } = useModal();

    useEffect(() => {
        if (!Content) {
            return;
        }
        const destroy = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeModal();
            }
        }
        window.addEventListener("keydown", destroy);
        return () => {
            window.removeEventListener("keydown", destroy);
        }
    }, [Content, closeModal]);

    if (!Content) {
        return null;
    }

    // console.log(Content);


    return (
        <div style={{
            width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0, backgroundColor: "#00000033", display: "flex",
            justifyContent: "center", alignItems: "center"
        }} onClick={e => {
            e.stopPropagation();
            closeModal()
        }
        }>
            {React.cloneElement(Content as any, { closeModal })}
            {/* <Content closeModal={closeModal} /> */}
        </div >
    )
}

export default Modal