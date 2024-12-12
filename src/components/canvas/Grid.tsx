import { GridHelperProps } from '@react-three/fiber'
import { Grid as GridDrei } from '@react-three/drei';


export type GridAxis = "xz" | "xy" | "yz"
function Grid({ axis = "xz", size = 10, layers, ...rest }: { axis?: GridAxis, size?: number; layers?: number, rest?: GridHelperProps }) {
    const rotation = axis === "xz" ? [0, 0, 0] : axis === "xy" ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]

    return <GridDrei
        cellSize={size * 0.1}
        sectionSize={size}
        cellThickness={0.5}
        sectionThickness={0.75}
        cellColor={"black"} sectionColor={"#1050ff"}
        infiniteGrid
        fadeDistance={300}
        layers={layers}
        rotation={rotation} {...rest}></GridDrei>
}

export default Grid