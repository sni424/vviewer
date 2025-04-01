import { useAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { THREE } from 'VTHREE';
import { skyBoxAtom } from '../scripts/atoms';

const SkyBoxPanel = () => {
  const [isOpen, setOpen] = useState(false);
  const [skyBoxInfo, setSkyBoxInfo] = useAtom(skyBoxAtom);
  const menuRef = useRef<HTMLDivElement>(null);

  // 파일 선택 시 jpg/png만 처리하여 TextureLoader로 텍스처 로드
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'image/jpeg' || file.type === 'image/png') {
      const url = URL.createObjectURL(file);
      new THREE.TextureLoader().load(url, tex => {
        setSkyBoxInfo(pre => ({
          ...pre,
          texture: tex,
        }));
      });
    }
  };

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

  return (
    <div className="overflow-auto w-full h-full" ref={menuRef}>
      <button
        className="w-[80px] mt-4 relative inline-flex items-center justify-center
       p-0.5 mb-2 me-2 overflow-hidden text-sm
        font-medium text-gray-900 rounded-lg group
         bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 
         group-hover:from-red-200 group-hover:via-red-300 
         group-hover:to-yellow-200 dark:text-white 
         dark:hover:text-gray-900 focus:ring-4 focus:outline-none 
         focus:ring-red-100 dark:focus:ring-red-400"
        onClick={() => {
          setSkyBoxInfo(pre => ({
            ...pre,
            isSkyBox: !pre.isSkyBox,
          }));
        }}
      >
        <span
          className="w-[80px] relative px-5 py-2.5 transition-all 
        ease-in duration-75 bg-white dark:bg-gray-900 rounded-md 
        group-hover:bg-transparent group-hover:dark:bg-transparent"
        >
          {skyBoxInfo.isSkyBox ? '삭제' : '생성'}
        </span>
      </button>

      <div className="p-4">
        <input
          type="file"
          accept="image/jpeg, image/png"
          onChange={handleFileChange}
          className="mb-4 block"
        />
        {skyBoxInfo.texture && (
          <img
            src={skyBoxInfo.texture.image.src}
            alt="Uploaded texture"
            className="w-48 h-auto border"
          />
        )}
      </div>
      <div className="p-4 relative inline-block text-left">
        <div>
          <label
            htmlFor="type"
            className="block text-sm/6 font-medium text-gray-900"
          >
            타입
          </label>
          <button
            type="button"
            className="inline-flex w-20 justify-center 
            gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm
             font-semibold text-gray-900 ring-1 shadow-xs ring-gray-300
              ring-inset hover:bg-gray-50"
            id="menu-button"
            aria-expanded="true"
            aria-haspopup="true"
            onClick={() => {
              setOpen(pre => !pre);
            }}
          >
            {skyBoxInfo.type}
            <svg
              className="-mr-1 size-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              data-slot="icon"
            >
              <path
                fill-rule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
        {isOpen && (
          <div
            className="absolute left-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white ring-1 shadow-lg ring-black/5 focus:outline-hidden"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="menu-button"
          >
            <ul className="py-1" role="none">
              <li
                className="block px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray010"
                role="menuitem"
                id="menu-item-0"
                onClick={() => {
                  setSkyBoxInfo(pre => ({
                    ...pre,
                    type: 'scene',
                  }));

                  setOpen(false);
                }}
              >
                scene-background
              </li>
              <li
                className="block px-4 py-2 text-sm text-gray-700 
              cursor-pointer hover:bg-gray010"
                role="menuitem"
                id="menu-item-1"
                onClick={() => {
                  setSkyBoxInfo(pre => ({
                    ...pre,
                    type: 'mesh',
                  }));
                  setOpen(false);
                }}
              >
                mesh
              </li>
            </ul>
          </div>
        )}
        {skyBoxInfo.type === 'scene' && (
          <div className="w-full h-full">
            <div>
              <label
                htmlFor="price"
                className="block text-sm/6 font-medium text-gray-900"
              >
                강도
              </label>

              <div className="mt-2 flex items-center">
                <input
                  id="default-range"
                  type="range"
                  value="1"
                  min={0}
                  max={10}
                  className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                />
                <div
                  className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                >
                  <input
                    id="price"
                    name="price"
                    type="number"
                    placeholder="0.00"
                    className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
            <div>
              <label
                htmlFor="price"
                className="block text-sm/6 font-medium text-gray-900"
              >
                회전
              </label>
              <div>
                <label>x</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value="1"
                    min={-360}
                    max={360}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="0.00"
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                    />
                  </div>
                </div>
                <label>y</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value="1"
                    min={-360}
                    max={360}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="0.00"
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                    />
                  </div>
                </div>
                <label>z</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value="1"
                    min={-360}
                    max={360}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="0.00"
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {skyBoxInfo.type === 'mesh' && (
          <div className="w-full h-full">
            <div>
              <label
                htmlFor="price"
                className="block text-sm/6 font-medium text-gray-900"
              >
                강도
              </label>

              <div className="mt-2 flex items-center">
                <input
                  id="default-range"
                  type="range"
                  value={skyBoxInfo.mesh.intensity ?? 1}
                  min={0}
                  max={10}
                  step={0.1}
                  className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                  onChange={e => {
                    setSkyBoxInfo(pre => ({
                      ...pre,
                      mesh: {
                        ...pre.mesh,
                        intensity: Number(e.target.value),
                      },
                    }));
                  }}
                />
                <div
                  className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                >
                  <input
                    id="price"
                    name="price"
                    type="number"
                    step={0.1}
                    value={skyBoxInfo.mesh.intensity ?? 1}
                    className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                    onChange={e => {
                      setSkyBoxInfo(pre => ({
                        ...pre,
                        mesh: {
                          ...pre.mesh,
                          intensity: Number(e.target.value),
                        },
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label
                htmlFor="price"
                className="block text-sm/6 font-medium text-gray-900"
              >
                회전
              </label>
              <div>
                <label>x</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value={skyBoxInfo.mesh.rotation.x ?? 0}
                    min={-180}
                    max={180}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                    onChange={e => {
                      setSkyBoxInfo(pre => ({
                        ...pre,
                        mesh: {
                          ...pre.mesh,
                          rotation: {
                            ...pre.mesh.rotation,
                            x: Number(e.target.value),
                          },
                        },
                      }));
                    }}
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step={0.1}
                      value={skyBoxInfo.mesh.rotation.x ?? 0}
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      onChange={e => {
                        setSkyBoxInfo(pre => ({
                          ...pre,
                          mesh: {
                            ...pre.mesh,
                            rotation: {
                              ...pre.mesh.rotation,
                              x: Number(e.target.value),
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
                <label>y</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value={skyBoxInfo.mesh.rotation.y ?? 0}
                    min={-180}
                    max={180}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                    onChange={e => {
                      setSkyBoxInfo(pre => ({
                        ...pre,
                        mesh: {
                          ...pre.mesh,
                          rotation: {
                            ...pre.mesh.rotation,
                            y: Number(e.target.value),
                          },
                        },
                      }));
                    }}
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step={0.1}
                      value={skyBoxInfo.mesh.rotation.y ?? 0}
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      onChange={e => {
                        setSkyBoxInfo(pre => ({
                          ...pre,
                          mesh: {
                            ...pre.mesh,
                            rotation: {
                              ...pre.mesh.rotation,
                              y: Number(e.target.value),
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
                <label>z</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value={skyBoxInfo.mesh.rotation.z ?? 0}
                    min={-180}
                    max={180}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                    onChange={e => {
                      setSkyBoxInfo(pre => ({
                        ...pre,
                        mesh: {
                          ...pre.mesh,
                          rotation: {
                            ...pre.mesh.rotation,
                            z: Number(e.target.value),
                          },
                        },
                      }));
                    }}
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step={0.1}
                      value={skyBoxInfo.mesh.rotation.z ?? 0}
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      onChange={e => {
                        setSkyBoxInfo(pre => ({
                          ...pre,
                          mesh: {
                            ...pre.mesh,
                            rotation: {
                              ...pre.mesh.rotation,
                              z: Number(e.target.value),
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label
                htmlFor="price"
                className="block text-sm/6 font-medium text-gray-900"
              >
                위치
              </label>
              <div>
                <label>x</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value={skyBoxInfo.mesh.position.x ?? 0}
                    min={-180}
                    max={180}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                    onChange={e => {
                      setSkyBoxInfo(pre => ({
                        ...pre,
                        mesh: {
                          ...pre.mesh,
                          position: {
                            ...pre.mesh.position,
                            x: Number(e.target.value),
                          },
                        },
                      }));
                    }}
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step={0.1}
                      value={skyBoxInfo.mesh.position.x ?? 0}
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      onChange={e => {
                        setSkyBoxInfo(pre => ({
                          ...pre,
                          mesh: {
                            ...pre.mesh,
                            position: {
                              ...pre.mesh.position,
                              x: Number(e.target.value),
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
                <label>y</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value={skyBoxInfo.mesh.position.y ?? 0}
                    min={-180}
                    max={180}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                    onChange={e => {
                      setSkyBoxInfo(pre => ({
                        ...pre,
                        mesh: {
                          ...pre.mesh,
                          position: {
                            ...pre.mesh.position,
                            y: Number(e.target.value),
                          },
                        },
                      }));
                    }}
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step={0.1}
                      value={skyBoxInfo.mesh.position.y ?? 0}
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      onChange={e => {
                        setSkyBoxInfo(pre => ({
                          ...pre,
                          mesh: {
                            ...pre.mesh,
                            position: {
                              ...pre.mesh.position,
                              y: Number(e.target.value),
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
                <label>z</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value={skyBoxInfo.mesh.position.z ?? 0}
                    min={-180}
                    max={180}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                    onChange={e => {
                      setSkyBoxInfo(pre => ({
                        ...pre,
                        mesh: {
                          ...pre.mesh,
                          position: {
                            ...pre.mesh.position,
                            z: Number(e.target.value),
                          },
                        },
                      }));
                    }}
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step={0.1}
                      value={skyBoxInfo.mesh.position.z ?? 0}
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      onChange={e => {
                        setSkyBoxInfo(pre => ({
                          ...pre,
                          mesh: {
                            ...pre.mesh,
                            position: {
                              ...pre.mesh.position,
                              z: Number(e.target.value),
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label
                htmlFor="price"
                className="block text-sm/6 font-medium text-gray-900"
              >
                크기
              </label>
              <div>
                <label>x</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value={skyBoxInfo.mesh.scale.x ?? 0}
                    min={-180}
                    max={180}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                    onChange={e => {
                      setSkyBoxInfo(pre => ({
                        ...pre,
                        mesh: {
                          ...pre.mesh,
                          scale: {
                            ...pre.mesh.scale,
                            x: Number(e.target.value),
                          },
                        },
                      }));
                    }}
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step={0.1}
                      value={skyBoxInfo.mesh.scale.x ?? 0}
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      onChange={e => {
                        setSkyBoxInfo(pre => ({
                          ...pre,
                          mesh: {
                            ...pre.mesh,
                            scale: {
                              ...pre.mesh.scale,
                              x: Number(e.target.value),
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
                <label>y</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value={skyBoxInfo.mesh.scale.y ?? 0}
                    min={-180}
                    max={180}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                    onChange={e => {
                      setSkyBoxInfo(pre => ({
                        ...pre,
                        mesh: {
                          ...pre.mesh,
                          scale: {
                            ...pre.mesh.scale,
                            y: Number(e.target.value),
                          },
                        },
                      }));
                    }}
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step={0.1}
                      value={skyBoxInfo.mesh.scale.y ?? 0}
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      onChange={e => {
                        setSkyBoxInfo(pre => ({
                          ...pre,
                          mesh: {
                            ...pre.mesh,
                            scale: {
                              ...pre.mesh.scale,
                              y: Number(e.target.value),
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
                <label>z</label>
                <div className="mt-2 flex items-center">
                  <input
                    id="default-range"
                    type="range"
                    value={skyBoxInfo.mesh.scale.z ?? 0}
                    min={-180}
                    max={180}
                    className="w-full h-2  rounded-lg appearance-none 
        cursor-pointer dark:bg-gray-700"
                    onChange={e => {
                      setSkyBoxInfo(pre => ({
                        ...pre,
                        mesh: {
                          ...pre.mesh,
                          scale: {
                            ...pre.mesh.scale,
                            z: Number(e.target.value),
                          },
                        },
                      }));
                    }}
                  />
                  <div
                    className="flex w-20 items-center rounded-md bg-white px-3 outline-1
           "
                  >
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step={0.1}
                      value={skyBoxInfo.mesh.scale.z ?? 0}
                      className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      onChange={e => {
                        setSkyBoxInfo(pre => ({
                          ...pre,
                          mesh: {
                            ...pre.mesh,
                            scale: {
                              ...pre.mesh.scale,
                              z: Number(e.target.value),
                            },
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkyBoxPanel;
