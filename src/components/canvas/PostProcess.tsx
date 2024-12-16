import { BrightnessContrast, EffectComposer } from '@react-three/postprocessing'
import { globalBrightnessContrastAtom, globalColorManagementAtom, globalSaturationCheckAtom, selectedAtom } from '../../scripts/atoms';
import { useAtomValue } from 'jotai';
import GlobalSaturationCheck from './GlobalSaturationCheck';
import GlobalColorManagement from './GlobalColorManagement';
import { useThree } from '@react-three/fiber';
import { THREE } from '../../scripts/VTHREE';
import { BlendFunction, KernelSize } from 'postprocessing';
import { Outline } from './Outline_';
import { Select, Selection } from './Selection';

const BrightnessContrastEffect = () => {
    const { on, brightnessValue, contrastValue } = useAtomValue(globalBrightnessContrastAtom);

    if (!on) {
        return null;
    }

    return <BrightnessContrast brightness={brightnessValue} contrast={contrastValue} />
}

function PostProcess() {
    const { scene } = useThree();

    // 각 컴포넌트 안에서 값만 바뀐다고 리렌더링되지 않음, 그냥 각 값이 바뀔 때 EffectComposer을 강제 리렌더링
    const _gbc = useAtomValue(globalBrightnessContrastAtom);
    const _gSat = useAtomValue(globalSaturationCheckAtom);
    const _gcm = useAtomValue(globalColorManagementAtom);
    // console.log(_gcm.value)

    const selecteds = useAtomValue(selectedAtom);

    const objects = selecteds.map(uuid => scene.getObjectByProperty("uuid", uuid)).filter(obj => obj?.type === "Mesh") as THREE.Mesh[];

    console.log("objects", objects.length)

    return (
        <EffectComposer >
            {/* <BrightnessContrastEffect></BrightnessContrastEffect> */}
            {/* <GlobalColorManagement></GlobalColorManagement>
            <GlobalSaturationCheck></GlobalSaturationCheck> */}
            {/* <Selection>
                {objects.map((obj, i) => {
                    // obj's world matrix
                    obj.updateMatrixWorld(true);
                    const cloned = obj.clone();
                    cloned.applyMatrix4(obj.matrixWorld);
                    cloned.matrixWorldNeedsUpdate = true;
                    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    mat.wireframe = true;
                    cloned.material = mat;

                    return <Select key={`selected-${obj.uuid}`} enabled>
                        <primitive object={cloned}></primitive>
                    </Select>
                })}
            </Selection>
            <Outline selection={objects}
                blendFunction={BlendFunction.SCREEN}
                edgeStrength={100}
                visibleEdgeColor={0x00ff00}
                hiddenEdgeColor={0x0000ff}
                selectionLayer={10}
            ></Outline> */}
        </EffectComposer>
    )
}

export default PostProcess