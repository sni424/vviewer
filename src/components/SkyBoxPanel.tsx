import { useAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { EXRLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
import { THREE } from 'VTHREE';
import { skyBoxAtom } from '../scripts/atoms';

// SliderInput 컴포넌트에 타입 추가
interface SliderInputProps {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
}

const SliderInput = ({
  label,
  value,
  onChange,
  min = -180,
  max = 180,
  step = 0.1,
}: SliderInputProps) => (
  <div>
    <label className="block text-sm/6 font-medium text-gray-900">{label}</label>
    <div className="mt-2 flex items-center">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        onChange={onChange}
      />
      <div className="flex w-20 items-center rounded-md bg-white px-3">
        <input
          type="number"
          step={step}
          value={value}
          className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 focus:outline-none sm:text-sm/6"
          onChange={onChange}
        />
      </div>
    </div>
  </div>
);

const SkyBoxPanel = () => {
  const [isOpen, setOpen] = useState(false);
  const [skyBoxInfo, setSkyBoxInfo] = useAtom(skyBoxAtom); // Jotai atom 사용
  const menuRef = useRef<HTMLDivElement>(null);

  // 파일 선택 시 jpg/png만 처리하여 TextureLoader로 텍스처 로드
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'image/jpeg' || file.type === 'image/png') {
      const url = URL.createObjectURL(file);
      new THREE.TextureLoader().load(url, (tex: THREE.Texture) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.colorSpace = THREE.SRGBColorSpace;

        setSkyBoxInfo(prev => ({
          ...prev,
          texture: tex,
        }));
      });
    } else {
      if (file.name.includes('hdr')) {
        const url = URL.createObjectURL(file);
        const rgbeLoader = new RGBELoader();
        rgbeLoader.load(url, texture => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.colorSpace = THREE.SRGBColorSpace;

          setSkyBoxInfo(prev => ({
            ...prev,
            texture: texture,
          }));
        });
      } else if (file.name.includes('.exr')) {
        const url = URL.createObjectURL(file);
        new EXRLoader().load(url, function (texture, textureData) {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.colorSpace = THREE.SRGBColorSpace;
          setSkyBoxInfo(prev => ({
            ...prev,
            texture: texture,
          }));
        });
      } else {
        window.alert('다른 타입');
      }
    }
  };

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 중첩 속성 업데이트 함수 (intensity 같은 단일 값)
  const updateProperty = (
    field: 'scene' | 'mesh',
    subField: 'intensity' | 'opacity',
    value: number,
  ) => {
    setSkyBoxInfo(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [subField]: value,
      },
    }));
  };

  // 업데이트 함수
  const updateVectorProperty = (
    field: 'scene' | 'mesh',
    vector: 'rotation' | 'position' | 'scale',
    axis: 'x' | 'y' | 'z',
    value: number,
  ) => {
    setSkyBoxInfo(prev => {
      if (field === 'scene' && vector !== 'rotation') {
        console.warn(`'scene' does not have '${vector}' property.`);
        return prev;
      }
      return {
        ...prev,
        [field]: {
          ...prev[field],
          [vector]: {
            ...((prev[field] as any)[vector] as THREE.Vector3),
            [axis]: value,
          },
        },
      };
    });
  };
  return (
    <div className="overflow-auto w-full h-full">
      {/* 스카이박스 생성/삭제 토글 버튼 */}
      <button
        className="w-[80px] mt-4 bg-gradient-to-br from-red-200 to-yellow-200"
        onClick={() =>
          setSkyBoxInfo(prev => ({ ...prev, isSkyBox: !prev.isSkyBox }))
        }
      >
        {skyBoxInfo.isSkyBox ? '삭제' : '생성'}
      </button>

      {skyBoxInfo.isSkyBox && (
        <>
          {/* 텍스처 업로드 */}
          <div className="p-4">
            <input
              type="file"
              accept="image/jpeg, image/png"
              onChange={handleFileChange}
            />
            {skyBoxInfo.texture && (
              <img
                src={
                  skyBoxInfo.texture.image instanceof HTMLImageElement
                    ? skyBoxInfo.texture.image.src
                    : undefined
                }
                alt="Uploaded texture"
                className="w-48 h-auto border"
              />
            )}
          </div>

          <div className="p-4">
            {/* 타입 선택 */}
            <div>
              <label>타입</label>
              <button
                onClick={() => setOpen(!isOpen)}
                className="inline-flex w-20 justify-center rounded-md bg-white"
              >
                {skyBoxInfo.type}
              </button>
            </div>

            {isOpen && (
              <div ref={menuRef}>
                <div
                  onClick={() => {
                    setSkyBoxInfo(prev => ({ ...prev, type: 'scene' }));
                    setOpen(false);
                  }}
                  className="cursor-pointer p-2 hover:bg-gray-100"
                >
                  scene-background
                </div>
                <div
                  onClick={() => {
                    setSkyBoxInfo(prev => ({ ...prev, type: 'mesh' }));
                    setOpen(false);
                  }}
                  className="cursor-pointer p-2 hover:bg-gray-100"
                >
                  mesh
                </div>
              </div>
            )}
            <div>
              <label>flipY</label>
              <input
                type="checkbox"
                id="isoView"
                name="isoView"
                checked={skyBoxInfo.flipY}
                onChange={e => {
                  setSkyBoxInfo(prev => ({ ...prev, flipY: !prev.flipY }));
                }}
              />
            </div>
            <div>
              <label>보기</label>
              <input
                type="checkbox"
                id="isoView"
                name="isoView"
                checked={skyBoxInfo.visible}
                onChange={e => {
                  setSkyBoxInfo(prev => ({ ...prev, visible: !prev.visible }));
                }}
              />
            </div>
            <div>
              <label>투명</label>
              <input
                type="checkbox"
                id="isoView"
                name="isoView"
                checked={skyBoxInfo.mesh.transparent}
                onChange={e => {
                  setSkyBoxInfo(prev => ({
                    ...prev,
                    mesh: {
                      ...prev.mesh,
                      transparent: !prev.mesh.transparent,
                    },
                  }));
                }}
              />
            </div>
            <SliderInput
              label="투명도"
              value={skyBoxInfo.mesh.opacity}
              onChange={e =>
                updateProperty(
                  skyBoxInfo.type as 'scene' | 'mesh',
                  'opacity',
                  Number(e.target.value),
                )
              }
              min={0}
              max={10}
              step={0.1}
            />
            {/* 공통 속성: 강도 */}
            <SliderInput
              label="강도"
              value={skyBoxInfo[skyBoxInfo.type as 'scene' | 'mesh'].intensity}
              onChange={e =>
                updateProperty(
                  skyBoxInfo.type as 'scene' | 'mesh',
                  'intensity',
                  Number(e.target.value),
                )
              }
              min={0}
              max={10}
              step={0.1}
            />

            {/* 공통 속성: 회전 */}
            {(['x', 'y', 'z'] as const).map(axis => (
              <SliderInput
                key={axis}
                label={`회전 ${axis}`}
                value={
                  skyBoxInfo[skyBoxInfo.type as 'scene' | 'mesh'].rotation[axis]
                }
                onChange={e =>
                  updateVectorProperty(
                    skyBoxInfo.type as 'scene' | 'mesh',
                    'rotation',
                    axis,
                    Number(e.target.value),
                  )
                }
                min={-180}
                max={180}
                step={0.1}
              />
            ))}

            {/* 메시 전용 속성 */}
            {skyBoxInfo.type === 'mesh' && (
              <>
                {/* 위치 */}
                {(['x', 'y', 'z'] as const).map(axis => (
                  <SliderInput
                    key={`pos-${axis}`}
                    label={`위치 ${axis}`}
                    value={skyBoxInfo.mesh.position[axis]}
                    onChange={e =>
                      updateVectorProperty(
                        'mesh',
                        'position',
                        axis,
                        Number(e.target.value),
                      )
                    }
                    min={-100}
                    max={100}
                    step={0.1}
                  />
                ))}

                {/* 크기 */}
                {(['x', 'y', 'z'] as const).map(axis => (
                  <SliderInput
                    key={`scale-${axis}`}
                    label={`크기 ${axis}`}
                    value={skyBoxInfo.mesh.scale[axis]}
                    onChange={e =>
                      updateVectorProperty(
                        'mesh',
                        'scale',
                        axis,
                        Number(e.target.value),
                      )
                    }
                    min={0.1}
                    max={10}
                    step={0.1}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SkyBoxPanel;
