import React, { createContext, useState, useContext, useEffect, useRef, useMemo } from 'react'
import { THREE } from '../../scripts/VTHREE'

export type Api = {
    selected: THREE.Object3D[]
    select: React.Dispatch<React.SetStateAction<THREE.Object3D[]>>
    enabled: boolean
}
export type SelectApi = JSX.IntrinsicElements['group'] & {
    enabled?: boolean
}

export const selectionContext = createContext<Api | null>(null)

export function Selection({ children, enabled = true }: { enabled?: boolean; children: React.ReactNode }) {
    const [selected, select] = useState<THREE.Object3D[]>([])
    const value = useMemo(() => ({ selected, select, enabled }), [selected, select, enabled])
    return <selectionContext.Provider value={value}>{children}</selectionContext.Provider>
}

export function Select({ enabled = false, children, ...props }: SelectApi) {
    const group = useRef<THREE.Group>(null!)
    const api = useContext(selectionContext)
    useEffect(() => {
        if (api && enabled) {
            // console.log(children)
            let changed = false
            const current: THREE.Object3D<THREE.Event>[] = []
            group.current.traverse((o) => {
                o.type === 'Mesh' && current.push(o)
                if (api.selected.indexOf(o) === -1) changed = true
            })
            // console.log(changed)
            if (changed) {
                api.select((state) => [...state, ...current])
                return () => {
                    api.select((state) => state.filter((selected) => !current.includes(selected)))
                }
            }
        }
    }, [enabled, children, api])
    return (
        <group ref={group} {...props}>
            {children}
        </group>
    )
}