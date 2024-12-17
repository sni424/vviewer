import { BrightnessContrast, EffectComposer } from '@react-three/postprocessing'
import { globalBrightnessContrastAtom, globalColorManagementAtom, globalSaturationCheckAtom } from '../../scripts/atoms';
import { useAtomValue } from 'jotai';
import GlobalSaturationCheck from './GlobalSaturationCheck';
import GlobalColorManagement from './GlobalColorManagement';

const BrightnessContrastEffect = () => {
    const { on, brightnessValue, contrastValue } = useAtomValue(globalBrightnessContrastAtom);

    if (!on) {
        return null;
    }

    return <BrightnessContrast brightness={brightnessValue} contrast={contrastValue} />
}

function PostProcess() {
    // 각 컴포넌트 안에서 값만 바뀐다고 리렌더링되지 않음, 그냥 각 값이 바뀔 때 EffectComposer을 강제 리렌더링
    const _gbc = useAtomValue(globalBrightnessContrastAtom);
    const _gSat = useAtomValue(globalSaturationCheckAtom);
    const _gcm = useAtomValue(globalColorManagementAtom);
    // console.log(_gcm.value)

    return (
        <EffectComposer >
            <BrightnessContrastEffect></BrightnessContrastEffect>
            {/* <GlobalColorManagement></GlobalColorManagement>
            <GlobalSaturationCheck></GlobalSaturationCheck> */}
        </EffectComposer>
    )
}

export default PostProcess