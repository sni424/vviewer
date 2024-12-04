import React, { useEffect } from 'react'
import { modalAtom, useModal } from './atoms';
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


    return (
        <div style={{
            width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0, backgroundColor: "#00000033", display: "flex",
            justifyContent: "center", alignItems: "center"
        }} onClick={closeModal}>
            {React.cloneElement(Content, { closeModal })}
        </div>
    )
}

export default Modal