import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useState } from 'react';
import { ColorPicker, ColorService, useColor } from 'react-color-palette';
//@ts-ignore
import 'react-color-palette/css';
import { THREE } from 'VTHREE';
import {
  AOMAP_INTENSITY_MAX,
  BUMP_SCALE_MAX,
  LIGHTMAP_INTENSITY_MAX,
} from '../Constants';
import {
  materialSelectedAtom,
  selectedAtom,
  threeExportsAtom,
} from '../scripts/atoms';
import VTextureLoader from '../scripts/loaders/VTextureLoader.ts';
import { loadHDRTexture, loadPNGAsENV } from '../scripts/utils';
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
  fileName?: string
) => {
  console.log('setMap', mapKey, texture, fileName, material);
  const mat = material.physical;
  const dstKey = mapKey as keyof THREE.MeshPhysicalMaterial;
  if (dstKey === 'lightMap') {
    mat.lightMap = texture;
    mat.vUserData.viz4dLightMap = fileName;
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
  const [flipY, setFlipY] = useState<boolean>(texture?.flipY ?? false);
  const [minFilter, setMinFilter] = useState<number>(texture?.minFilter ?? 0);
  const setMaterialSelected = useSetAtom(materialSelectedAtom);
  const threeExports = useAtomValue(threeExportsAtom)!;
  const uuid = texture?.uuid;

  const materialRangeKey = materialRange?.matKey as keyof THREE.MeshStandardMaterial;
  let materialValue = materialRangeKey
    ? (material as THREE.MeshStandardMaterial)[materialRangeKey]
    : undefined;

  if (materialValue) {
    if (typeof materialValue === 'object') {
      const keys = Object.keys(materialValue);
      if (keys.includes('x') && keys.length === 2) {
        materialValue = (materialValue as THREE.Vector2).x;
      }
    }
  }

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
      const fileName = file.name;
      console.log('dropped file', fileName, file);
      const isEnvMap = props.matKey === 'envMap';
      if (isEnvMap) {
        if (
          !(
            fileName.toLowerCase().endsWith('hdr') ||
            fileName.toLowerCase().endsWith('exr') ||
            fileName.toLowerCase().endsWith('png')
          )
        ) {
          alert('환경맵은 HDR/EXR/PNG 형식만 지원합니다.');
          return;
        }
        if (fileName.toLowerCase().endsWith('png')) {
          loadPNGAsENV(URL.createObjectURL(file), threeExports.gl).then(
            texture => {
              setMap(material, mapKey, texture);
            },
          );
        } else {
          loadHDRTexture(URL.createObjectURL(file)).then(texture => {
            console.log(fileName);
            setMap(material, mapKey, texture);
          });
        }
      } else {
        const acceptedExtensions = ['.png', '.jpg', '.exr', '.hdr'];
        if (
          !acceptedExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
        ) {
          alert('다음 확장자만 적용 가능 : ' + acceptedExtensions.join(', '));
          return;
        }

        VTextureLoader.loadAsync(file, threeExports).then(texture => {
          setMap(material, mapKey, texture, fileName);
        });
      }

      e.dataTransfer.clearData();
    }
  };

  useEffect(() => {
    if (texture) {
      setFlipY(texture.flipY);
      setChannel(texture.channel)
    }
  }, [texture]);

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
      {texture && (
        <div style={{ fontSize: 11, display: 'flex' }}>
          <div>FlipY: {flipY ? 'O' : 'X'}</div>
          <button
            style={{ fontSize: 11, height: 18, marginLeft: 8 }}
            onClick={() => {
              setFlipY(pre => {
                texture.flipY = !pre;
                texture.needsUpdate = true;
                material.needsUpdate = true;
                return !pre;
              });
            }}
          >
            flip Y
          </button>
        </div>
      )}
      {/*{texture && (*/}
      {/*  <div style={{ fontSize: 11, display: 'flex' }}>*/}
      {/*    <div>minFilter: {minFilter === 1006 ? 'Linear' : minFilter}</div>*/}
      {/*    <button*/}
      {/*      style={{ fontSize: 11, height: 18, marginLeft: 8 }}*/}
      {/*      onClick={() => {*/}
      {/*        setMinFilter(pre => {*/}
      {/*          if (pre === 1006) {*/}
      {/*            const target = 1008*/}
      {/*            texture.minFilter = target;*/}
      {/*            texture.needsUpdate = true;*/}
      {/*            return target*/}
      {/*          } else {*/}
      {/*            const target = 1006*/}
      {/*            texture.minFilter = target;*/}
      {/*            texture.needsUpdate = true;*/}
      {/*            return target*/}
      {/*          }*/}
      {/*        })*/}

      {/*      }}*/}
      {/*    >*/}
      {/*      minFilter*/}
      {/*    </button>*/}
      {/*  </div>*/}
      {/*)}*/}
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

const MapSection = ({ mat }: { mat: THREE.MeshPhysicalMaterial }) => {
  const isPhysical = mat.type === 'MeshPhysicalMaterial';
  console.log('mat', mat);
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
          <MapInfo label="Normal" material={mat} matKey="normalMap" materialRange={{
            matKey: 'normalScale',
            onChange: value => {
              mat.standard.normalScale.set(value, -value);
              mat.needsUpdate = true;
            },
            min: 0,
            max: 5
          }}></MapInfo>
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
            label="Bump"
            material={mat}
            matKey="bumpMap"
            materialRange={{
              matKey: 'bumpScale',
              onChange: value => {
                mat.bumpScale = value;
                mat.needsUpdate = true;
              },
              max: BUMP_SCALE_MAX,
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
            <MapInfo material={mat} matKey='specularColorMap' label="Specular Color Map" materialRange={{
              matKey: 'specularIntensity',
              onChange: value => {
                mat.specularIntensity = value;
                mat.needsUpdate = true;
              },
              max: 1
            }}/>
          )}
          {isPhysical && (
            <MaterialPhysicalPanels mat={mat as THREE.MeshPhysicalMaterial} />
          )}

          <ColorInfo mat={mat} />
          <OpacityPanel mat={mat} />
          {mat.emissive !== undefined && <EmissiveInfo mat={mat} />}
          {mat.specularColor !== undefined && <SpecularColorInfo mat={mat} />}

        </div>
      </div>
    </section>
  );
};

const ColorInfo = ({ mat }: { mat: THREE.MeshPhysicalMaterial }) => {
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

const EmissiveInfo = ({ mat }: { mat: THREE.Material }) => {
  const [diffuseColor, setDiffuseColor] = useColor(
    `#${mat.emissive.getHexString()}`,
  );
  // const originalColor = mat.vUserData.originalColor;

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
        <strong>emissive색상</strong>
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
              mat.emissive.set(color.hex);
              setDiffuseColor(color);
            }} // 컬러 변경될 때마다 실행할 이벤트
          />
        </div>
      </div>
    </div>
  );
};

const SpecularColorInfo = ({ mat }: { mat: THREE.Material }) => {
  const [diffuseColor, setDiffuseColor] = useColor(
    `#${mat.specularColor.getHexString()}`,
  );
  // const originalColor = mat.vUserData.originalColor;

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
        <strong>specular색상</strong>
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
              mat.specularColor.set(color.hex);
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
  const [transmissionValue, setTransmissionValue] = useState(
    mat.transmission ?? 0,
  );
  const [thickNessValue, setThickNessValue] = useState(mat.thickness ?? 0);

  useEffect(() => {
    setTransparent(mat.transparent);
    setOpacity(mat.opacity);
    setTransmissionValue(mat.transmission ?? 0);
    setThickNessValue(mat.thickness ?? 0);
  }, [mat]);

  return (
    <div>
      <strong style={{ fontSize: 12 }}>Transparency</strong>

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
        {mat.type === 'MeshPhysicalMaterial' && (
          <div className="">
            <strong>transmission</strong>
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
                  value={transmissionValue}
                  onChange={e => {
                    const value = parseFloat(e.target.value);
                    setTransmissionValue(value);
                    mat.transmission = value;
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
                value={transmissionValue}
                onChange={e => {
                  const value = parseFloat(e.target.value);
                  setTransmissionValue(value);
                  mat.transmission = value;
                  mat.needsUpdate = true;
                }}
              />
            </div>

            <strong>thickNess</strong>
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
                  min={-5}
                  max={5}
                  step={0.01}
                  value={thickNessValue}
                  onChange={e => {
                    const value = parseFloat(e.target.value);
                    setThickNessValue(value);
                    mat.thickness = value;
                    mat.needsUpdate = true;
                  }}
                />
              </div>
              <input
                style={{ width: 35, borderRadius: 4 }}
                type="number"
                min={-5}
                max={5}
                step={0.01}
                value={thickNessValue}
                onChange={e => {
                  const value = parseFloat(e.target.value);
                  setThickNessValue(value);
                  mat.thickness = value;
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

      <MapSection mat={mat.physical} />

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
  console.log(mat.name);
  const [specular, setSpecular] = useState<number>(mat.specularIntensity);
  const [reflectivity, setReflectivity] = useState<number>(mat.reflectivity);
  const [ior, setIor] = useState<number>(mat.ior);
  return (
    <div className="w-full">
      <MapInfo
        label="Displacement Map"
        material={mat}
        matKey="displacementMap"
        materialRange={{
          matKey: 'displacementScale',
          onChange: value => {
            mat.displacementScale = value;
            mat.needsUpdate = true;
          },
          max: 10,
        }}
      ></MapInfo>
      <strong>Reflectivity</strong>
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
            max={2.0}
            step={0.01}
            value={reflectivity}
            onChange={e => {
              const value = parseFloat(e.target.value);
              mat.reflectivity = value;
              setReflectivity(value);
              mat.needsUpdate = true;
            }}
          />
        </div>
        <input
          style={{ width: 35, borderRadius: 4 }}
          type="number"
          min={0}
          max={2.0}
          step={0.01}
          value={reflectivity}
          onChange={e => {
            const value = parseFloat(e.target.value);
            mat.reflectivity = value;
            setReflectivity(value);
            mat.needsUpdate = true;
          }}
        />
      </div>
      <strong>IOR</strong>
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
            min={1.0}
            max={2.3333}
            step={0.01}
            value={ior}
            onChange={e => {
              const value = parseFloat(e.target.value);
              mat.ior = value;
              setIor(value);
              mat.needsUpdate = true;
            }}
          />
        </div>
        <input
          style={{ width: 35, borderRadius: 4 }}
          type="number"
          min={1.0}
          max={2.3333}
          step={0.01}
          value={ior}
          onChange={e => {
            const value = parseFloat(e.target.value);
            mat.ior = value;
            setIor(value);
            mat.needsUpdate = true;
          }}
        />
      </div>
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
