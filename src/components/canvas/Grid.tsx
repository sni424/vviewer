import { GridHelperProps } from '@react-three/fiber'
import React from 'react'

export type GridAxis = "xz" | "xy" | "yz"
function Grid({ axis = "xz", size = 20, ...rest }: { axis?: GridAxis, size?: number; rest?: GridHelperProps }) {
    const rotation = axis === "xz" ? [0, 0, 0] : axis === "xy" ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]

    return (
        <gridHelper rotation={rotation} args={[size, size, 0xff0000cc, 'lightgray']} {...rest} />
    )
}

export default Grid