import { Dispatch, RefObject, SetStateAction, useState } from 'react';
import { useAtom } from 'jotai';
import { MaxFile, maxFileAtom } from 'src/pages/max/maxAtoms.ts';
import useMaxFileController from 'src/pages/max/UseMaxFileController.ts';
import * as THREE from 'VTHREE';
import { EnvController } from 'src/components/mobile/MobileControlPanel.tsx';

const MaxPageRightBar = ({
  expanded,
  setExpanded,
  scene,
}: {
  expanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  scene?: THREE.Scene;
}) => {
  const [files, setFiles] = useAtom(maxFileAtom);
  const { handleMaxFile } = useMaxFileController();
  const [_, render] = useState(0);

  function rerender() {
    render(pre => pre + 1);
  }

  const materials = files.filter(file => {
    return file.type === 'material' && file.loaded;
  });

  async function load(maxFile: MaxFile) {
    handleMaxFile(maxFile).then(() => {
      rerender();
    });
  }

  return (
    <>
      {!expanded && (
        <button
          className="py-2 px-3.5 text-sm absolute right-2 top-2 rounded-3xl"
          onClick={() => setExpanded(true)}
        >
          {'<'}
        </button>
      )}
      <div
        className="absolute w-[25%] top-0 h-full z-50 bg-[#ffffff] transition-all border-l border-l-gray"
        style={{ right: expanded ? 0 : '-25%' }}
      >
        <div className="relative p-2">
          <button
            className="border-none bg-transparent text-sm font-bold px-2"
            onClick={() => setExpanded(false)}
          >
            {'>'}
          </button>
          <section className="p-1 my-1 text-sm">
            <div className="border-b border-gray-400 w-full p-1 flex gap-x-2 items-center">
              <strong className="text-sm">Files</strong>
              <span className="text-sm">{files.length}개</span>
            </div>
            <div className="p-1 h-[300px] w-full max-h-[300px] overflow-y-auto">
              {files.map(maxFile => {
                const { originalFile, type, loaded } = maxFile;
                return (
                  <div className="text-sm my-1">
                    <p className="text-gray-500">{type}</p>
                    <span>{originalFile.name}</span>
                    <span
                      className="ml-1"
                      style={{ color: loaded ? 'blue' : 'red' }}
                    >
                      {loaded ? '로드 됨' : '로드 안됨'}
                    </span>
                    <button onClick={() => load(maxFile)}>로드</button>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="p-1 my-1 text-sm">
            <div className="border-b border-gray-400 w-full p-1 flex gap-x-2 items-center">
              <strong className="text-sm">Materials</strong>
              <span className="text-sm">{materials.length}개</span>
            </div>
            <div className="p-1 h-[300px] w-full max-h-[300px] overflow-y-auto">
              {materials.map(maxFile => {
                const { originalFile, loaded, resultData } = maxFile;
                return (
                  <div className="text-sm my-1">
                    <span>{originalFile.name}</span>
                    <span
                      className="ml-1"
                      style={{ color: loaded ? 'blue' : 'red' }}
                    >
                      {loaded ? '로드 됨' : '로드 안됨'}
                    </span>
                    <button onClick={() => load(maxFile)}>로드</button>
                    <button
                      disabled={!loaded && !resultData}
                      onClick={() => {
                        console.log('scene', scene);
                        if (scene && loaded && resultData) {
                          const material = resultData;
                          scene.children.forEach(o => {
                            console.log(o);
                            if (o.type === 'Mesh') {
                              (o as THREE.Mesh).material = material;
                            }
                          })
                          material.needsUpdate = true;
                        }
                      }}
                    >
                      적용
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
          <section>
            <EnvController/>
          </section>
        </div>
      </div>
    </>
  );
};

export default MaxPageRightBar;
