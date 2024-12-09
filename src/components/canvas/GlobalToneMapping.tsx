import { useAtomValue } from 'jotai'
import React from 'react'
import { globalToneMappingAtom } from '../../scripts/atoms'
import { ToneMapping } from '@react-three/postprocessing';

function GlobalToneMapping() {
    const on = useAtomValue(globalToneMappingAtom);
    if (!on) {
        return null;
    }

    return (
        <ToneMapping />
    )
}

export default GlobalToneMapping