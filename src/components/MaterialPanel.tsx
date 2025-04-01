import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { ColorPicker, ColorService, useColor } from 'react-color-palette';
//@ts-ignore
import 'react-color-palette/css';
import { AOMAP_INTENSITY_MAX, LIGHTMAP_INTENSITY_MAX } from '../Constants';
import {
  materialSelectedAtom,
  selectedAtom,
  threeExportsAtom,
} from '../scripts/atoms';
import VTextureLoader from '../scripts/loaders/VTextureLoader.ts';
import { loadHDRTexture, loadPNGAsENV } from '../scripts/utils';
import { THREE } from '../scripts/vthree/VTHREE.ts';
import MapPreview, { MapPreviewProps } from './MapPreview';
import ProbeSelector from './ProbeSelector.tsx';

interface MapInfoProps extends MapPreviewProps {
  materialRange?: {
    matKey: string;
    onChange: (value: number) => any;
    min?: number; // default : 0
    max?: number; // default : 1
    step?: number; // default : (max-min)/100
  };
  textureRange?: {
    texKey: string;
    onChange: (value: number) => any;
    min?: number; // default : 0
    max?: number; // default : 1
    step?: number; // default : (max-min)/100
  };
  label?: string;
  forceUpdate?: () => any;
}

const setMap = (
  material: THREE.Material,
  mapKey: string,
  texture: THREE.Texture | null,
) => {
  const mat = material.physical;
  const dstKey = mapKey as keyof THREE.MeshPhysicalMaterial;
  if (dstKey === 'lightMap') {
    mat.lightMap = texture;
  } else if (dstKey === 'map') {
    mat.map = texture;
  } else if (dstKey === 'emissiveMap') {
    mat.emissiveMap = texture;
  } else if (dstKey === 'bumpMap') {
    mat.bumpMap = texture;
  } else if (dstKey === 'normalMap') {
    mat.normalMap = texture;
  } else if (dstKey === 'displacementMap') {
    mat.displacementMap = texture;
  } else if (dstKey === 'roughnessMap') {
    mat.roughnessMap = texture;
  } else if (dstKey === 'metalnessMap') {
    mat.metalnessMap = texture;
  } else if (dstKey === 'alphaMap') {
    mat.alphaMap = texture;
  } else if (dstKey === 'envMap') {
    if (texture) {
      mat.envMap = texture;
    } else {
      mat.envMap = null;
      delete mat.vUserData.probeId;
      mat.needsUpdate = true;
    }
  } else if (dstKey === 'aoMap') {
    mat.aoMap = texture;
  } else {
    throw new Error('Invalid mapKey @MaterialPanel');
  }
  mat.needsUpdate = true;
};

const MapInfo = (props: MapInfoProps) => {
  const {
    label,
    material,
    matKey: mapKey,
    materialRange,
    textureRange,
  } = props;
  const texture = material[mapKey as keyof THREE.Material] as THREE.Texture;
  const [channel, setChannel] = useState(texture?.channel ?? -1);
  const setMaterialSelected = useSetAtom(materialSelectedAtom);
  const threeExports = useAtomValue(threeExportsAtom)!;

  const materialRangeKey = materialRange?.matKey as keyof THREE.Material;
  const materialValue = materialRangeKey
    ? material[materialRangeKey]
    : undefined;
  const [materialRangeValue, setMaterialRangeValue] = useState(
    (materialValue as number) ?? -1,
  );
  const materialMin = materialRange?.min ?? 0;
  const materialMax = materialRange?.max ?? 1;
  const materialStep = materialRange?.step ?? (materialMax - materialMin) / 100;

  const textureRangeKey = textureRange?.texKey as keyof THREE.Texture;
  const textureValue = textureRangeKey ? texture[textureRangeKey] : undefined;
  const [textureRangeValue, setTextureRangeValue] = useState(
    textureValue ?? -1,
  );
  const textureMin = textureRange?.min ?? 0;
  const textureMax = textureRange?.max ?? 1;
  const textureStep = textureRange?.step ?? (textureMax - textureMin) / 100;

  const [isDragging, setIsDragging] = useState(false);

  const reload = () => {
    const curMat = props.material;
    setTimeout(() => {
      setMaterialSelected(curMat);
    }, 50);
    setMaterialSelected(null);
  };

  useEffect(() => {
    setChannel(texture?.channel ?? -1);
    setMaterialRangeValue(materialValue as number);
    setTextureRangeValue(textureValue as number);
  }, [props.material]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const isEnvMap = props.matKey === 'envMap';
      if (isEnvMap) {
        if (
          !(
            file.name.toLowerCase().endsWith('hdr') ||
            file.name.toLowerCase().endsWith('exr') ||
            file.name.toLowerCase().endsWith('png')
          )
        ) {
          alert('환경맵은 HDR/EXR/PNG 형식만 지원합니다.');
          return;
        }
        if (file.name.toLowerCase().endsWith('png')) {
          loadPNGAsENV(URL.createObjectURL(file), threeExports.gl).then(
            texture => {
              setMap(material, mapKey, texture);
            },
          );
        } else {
          loadHDRTexture(URL.createObjectURL(file)).then(texture => {
            setMap(material, mapKey, texture);
          });
        }
      } else {
        const acceptedExtensions = ['.png', '.jpg', '.exr', '.hdr'];
        if (
          !acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
        ) {
          alert('다음 확장자만 적용 가능 : ' + acceptedExtensions.join(', '));
          return;
        }

        VTextureLoader.loadAsync(file, threeExports).then(texture => {
          setMap(material, mapKey, texture);
        });
      }

      e.dataTransfer.clearData();
    }
  };

  return (
    <div
      key={`mapinfo-${props.matKey}-${props.material.uuid}`}
      style={{
        fontSize: 11,
        width: '100%',
        boxSizing: 'border-box',
        border: isDragging ? '1px dashed black' : undefined,
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        {label && <strong style={{ fontSize: 12 }}>{label}</strong>}
        <button
          style={{ fontSize: 10 }}
          onClick={() => {
            setMap(material, mapKey, null);
            reload();
          }}
        >
          삭제
        </button>
      </div>

      <MapPreview
        key={`mappreview-${props.matKey}-${props.material.uuid}`}
        {...props}
      ></MapPreview>
      {channel !== -1 && (
        <div style={{ fontSize: 11, display: 'flex' }}>
          <div>Channel: {String(channel)}</div>
          <button
            style={{ fontSize: 11, height: 18 }}
            onClick={() => {
              setChannel(prev => Math.max(prev - 1, 0));
              texture.channel = Math.max(texture.channel - 1, 0);
              material.needsUpdate = true;
            }}
          >
            -1
          </button>
          <button
            style={{ fontSize: 11, height: 18 }}
            onClick={() => {
              setChannel(prev => prev + 1);
              texture.channel = texture.channel + 1;
              material.needsUpdate = true;
            }}
          >
            +1
          </button>
        </div>
      )}
      {materialRange && materialValue !== undefined && (
        <div style={{ display: 'flex', width: '100%', gap: 8 }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <input
              style={{ width: '100%' }}
              type="range"
              min={materialMin}
              max={materialMax}
              step={materialStep}
              value={materialRangeValue}
              onChange={e => {
                const value = parseFloat(e.target.value);
                materialRange.onChange(value);
                setMaterialRangeValue(value);
              }}
            />
          </div>

          {/* <div style={{ width: 25 }}>
                        {toNthDigit(materialRangeValue, 2)}
                    </div> */}
          <input
            style={{ width: 35, borderRadius: 4 }}
            type="number"
            min={materialMin}
            max={materialMax}
            step={materialStep}
            value={materialRangeValue}
            onChange={e => {
              const value = parseFloat(e.target.value);
              materialRange.onChange(value);
              setMaterialRangeValue(value);
            }}
          />
        </div>
      )}
      {textureRange && textureValue !== undefined && (
        <div style={{ display: 'flex', width: '100%' }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <input
              style={{
                width: '100%',
              }}
              type="range"
              min={textureMin}
              max={textureMax}
              step={textureStep}
              value={textureRangeValue}
              onChange={e => {
                const value = parseFloat(e.target.value);
                textureRange.onChange(value);
                setTextureRangeValue(value);
              }}
            />
          </div>
          {/* <div style={{ width: 25 }}>
                        {toNthDigit(textureRangeValue, 2)}
                    </div> */}
          <input
            style={{ width: 35, borderRadius: 4 }}
            type="number"
            min={textureMin}
            max={textureMax}
            step={textureStep}
            value={textureRangeValue}
            onChange={e => {
              const value = parseFloat(e.target.value);
              textureRange.onChange(value);
              setTextureRangeValue(value);
            }}
          />
        </div>
      )}
    </div>
  );
};

const UserDataSection = ({ mat }: { mat: THREE.Material }) => {
  const userData = mat.vUserData;
  const keys = Object.keys(userData);

  return (
    <ul>
      <strong>UserData</strong>
      {keys.map((key, i) => {
        return (
          <li className="pl-4" key={`mat-userdata-${mat.uuid}-${i}`}>
            <span>{key}</span> :{' '}
            {JSON.stringify(userData[key as keyof typeof userData])}
          </li>
        );
      })}
    </ul>
  );
};

const MapSection = ({ mat }: { mat: THREE.Material }) => {
  const isPhysical = mat.type === 'MeshPhysicalMaterial';

  return (
    <section
      className="relative"
      style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid gray',
          padding: 8,
          borderRadius: 8,
          boxSizing: 'border-box',
          fontSize: 13,
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            rowGap: 12,
            columnGap: 12,
          }}
        >
          <MapInfo
            label="Light Map"
            material={mat}
            matKey="lightMap"
            materialRange={{
              matKey: 'lightMapIntensity',
              onChange: value => {
                mat.standard.lightMapIntensity = value;
                mat.needsUpdate = true;
              },
              max: LIGHTMAP_INTENSITY_MAX,
            }}
          ></MapInfo>
          <MapInfo label="Diffuse" material={mat} matKey="map"></MapInfo>
          <MapInfo label="Normal" material={mat} matKey="normalMap"></MapInfo>
          <MapInfo
            label="Roughness"
            material={mat}
            matKey="roughnessMap"
            materialRange={{
              matKey: 'roughness',
              onChange: value => {
                mat.standard.roughness = value;
                mat.needsUpdate = true;
              },
            }}
          ></MapInfo>
          <MapInfo
            label="Metalness"
            material={mat}
            matKey="metalnessMap"
            materialRange={{
              matKey: 'metalness',
              onChange: value => {
                mat.metalness = value;
                mat.needsUpdate = true;
              },
            }}
          ></MapInfo>
          <MapInfo
            label="AO"
            material={mat}
            matKey="aoMap"
            materialRange={{
              matKey: 'aoMapIntensity',
              onChange: value => {
                mat.aoMapIntensity = value;
                mat.needsUpdate = true;
              },
              max: AOMAP_INTENSITY_MAX,
            }}
          ></MapInfo>
          <MapInfo
            label="Emissive"
            material={mat}
            matKey="emissiveMap"
            materialRange={{
              matKey: 'emissiveIntensity',
              onChange: value => {
                mat.emissiveIntensity = value;
                mat.needsUpdate = true;
              },
              max: 10,
            }}
          ></MapInfo>
          <MapInfo
            label="Env Map"
            material={mat}
            matKey="envMap"
            materialRange={{
              matKey: 'envMapIntensity',
              onChange: value => {
                mat.envMapIntensity = value;
                mat.needsUpdate = true;
              },
              max: 10,
            }}
          ></MapInfo>
          {isPhysical && (
            <MaterialPhysicalPanels mat={mat as THREE.MeshPhysicalMaterial} />
          )}
          <ColorInfo mat={mat} />
          <OpacityPanel mat={mat} />
        </div>
      </div>
    </section>
  );
};

const ColorInfo = ({ mat }: { mat: THREE.Material }) => {
  const [diffuseColor, setDiffuseColor] = useColor(
    `#${mat.color.getHexString()}`,
  );
  const originalColor = mat.vUserData.originalColor;

  return (
    <div
      key={`colorInfo-${mat.uuid}`}
      style={{
        fontSize: 11,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div className="flex gap-8">
        <strong>색상</strong>
        <button
          style={{ fontSize: 10 }}
          onClick={() => {
            const hex = `#${originalColor}`;
            mat.color.set(hex);
            setDiffuseColor({
              hex: `#${originalColor}`,
              rgb: ColorService.toRgb(hex),
              hsv: ColorService.toHsv(hex),
            });
          }}
        >
          원래대로
        </button>
      </div>
      <div className="flex gap-2">
        <div
          className="w-[60px] h-[60px] mt-2 cursor-pointer"
          style={{ backgroundColor: diffuseColor.hex }}
        ></div>
        <div className="w-[120px] mt-2">
          <ColorPicker
            height={50} // 높이 px단위로 설정 (디폴트: 200)
            hideAlpha={true} // 투명도 조절바 숨김 (디폴트: 안숨김)
            color={diffuseColor} // 현재 지정된 컬러
            onChange={color => {
              mat.color.set(color.hex);
              setDiffuseColor(color);
            }} // 컬러 변경될 때마다 실행할 이벤트
          />
        </div>
      </div>
    </div>
  );
};

const OpacityPanel = ({ mat }: { mat: THREE.Material }) => {
  const [opacity, setOpacity] = useState(mat.opacity);
  const [transparent, setTransparent] = useState(mat.transparent);
  const [depthWrite, setDepthWrite] = useState(mat.depthWrite);
  const [depthTest, setDepthTest] = useState(mat.depthTest);

  useEffect(() => {
    setTransparent(mat.transparent);
    setOpacity(mat.opacity);
  }, [mat]);

  return (
    <div>
      <strong style={{fontSize: 12}}>Transparency</strong>

      <div className="w-full flex flex-col gap-y-1 text-[11px] p-1 border border-black rounded mt-1">
        <div className="flex items-center gap-x-2">
          <strong>투명도 설정</strong>
          <input
            type="checkbox"
            checked={transparent}
            onChange={e => {
              const value = e.target.checked;
              setTransparent(value);
              mat.transparent = value;
              mat.needsUpdate = true;
            }}
          />
        </div>
        {transparent && (
          <div className="">
            <strong>Opacity</strong>
            <div style={{ display: 'flex', width: '100%', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <input
                  style={{
                    width: '100%',
                  }}
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={mat.opacity}
                  onChange={e => {
                    const value = parseFloat(e.target.value);
                    mat.opacity = value;
                    setOpacity(value);
                    mat.needsUpdate = true;
                  }}
                />
              </div>
              <input
                style={{ width: 35, borderRadius: 4 }}
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={opacity}
                onChange={e => {
                  const value = parseFloat(e.target.value);
                  mat.opacity = value;
                  setOpacity(value);
                  mat.needsUpdate = true;
                }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-x-2">
          <strong>depth Test</strong>
          <input
            type="checkbox"
            checked={depthTest}
            onChange={e => {
              const value = e.target.checked;
              setDepthTest(value);
              mat.depthTest = value;
            }}
          />
        </div>
        <div className="flex items-center gap-x-2">
          <strong>depth Write</strong>
          <input
            type="checkbox"
            checked={depthWrite}
            onChange={e => {
              const value = e.target.checked;
              setDepthWrite(value);
              mat.depthWrite = value;
            }}
          />
        </div>
      </div>
    </div>
  );
};

function MaterialPanelContainer() {
  const selecteds = useAtomValue(selectedAtom);
  const threeExports = useAtomValue(threeExportsAtom);
  const [mat, setMat] = useAtom(materialSelectedAtom);
  if (!mat || !threeExports) {
    return null;
  }

  const isStandard = mat.type === 'MeshStandardMaterial';

  function standardToPhysical() {
    if (mat && threeExports) {
      const copiedMat = new THREE.MeshPhysicalMaterial({
        ...mat,
        type: 'MeshPhysicalMaterial',
      });
      const scene = threeExports.scene;

      scene.traverse(o => {
        if (o.type === 'Mesh') {
          const mesh = o as THREE.Mesh;
          const originalMaterial = mesh.material as THREE.Material;
          if (originalMaterial.uuid === copiedMat.uuid) {
            console.log('sameMaterial Found');
            mesh.material = copiedMat;
          }
        }
      });

      copiedMat.needsUpdate = true;

      setMat(copiedMat);
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 10,
        top: 10,
        maxHeight:
          selecteds.length > 0 ? 'calc(50% - 20px)' : 'calc(100% - 20px)',
        width: 400,
        backgroundColor: '#bbbbbb99',
        padding: 8,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          marginTop: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: 12 }}>{mat.name}</div>
        <div style={{ fontSize: 10, color: '#444' }}>{mat.type}</div>
      </div>
      {/* <MaterialPanel style={{width:"100%"}} mat={mat}></MaterialPanel> */}
      <ProbeSelector material={mat}></ProbeSelector>

      <MapSection mat={mat as THREE.Material} />

      <button
        onClick={() => {
          console.log(mat);
        }}
      >
        디버깅
      </button>
      <UserDataSection
        mat={mat as THREE.MeshStandardMaterial}
      ></UserDataSection>

      <div
        style={{
          position: 'absolute',
          top: 5,
          right: 5,
          fontSize: 12,
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
        onClick={() => {
          setMat(null);
        }}
      >
        X
      </div>
    </div>
  );
}

const MaterialPhysicalPanels = ({
  mat,
}: {
  mat: THREE.MeshPhysicalMaterial;
}) => {
  const [specular, setSpecular] = useState<number>(mat.specularIntensity);
  return (
    <div className="w-full py-2.5">
      <strong>Specular</strong>
      <div style={{ display: 'flex', width: '100%', gap: 8 }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <input
            style={{
              width: '100%',
            }}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={specular}
            onChange={e => {
              const value = parseFloat(e.target.value);
              mat.specularIntensity = value;
              setSpecular(value);
              mat.needsUpdate = true;
            }}
          />
        </div>
        <input
          style={{ width: 35, borderRadius: 4 }}
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={specular}
          onChange={e => {
            const value = parseFloat(e.target.value);
            mat.specularIntensity = value;
            setSpecular(value);
            mat.needsUpdate = true;
          }}
        />
      </div>
    </div>
  );
};

export default MaterialPanelContainer;
