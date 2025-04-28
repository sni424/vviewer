import { Dispatch, SetStateAction } from 'react';
import { useAtom } from 'jotai';
import { maxFileAtom } from 'src/pages/max/maxAtoms.ts';

const MaxPageRightBar = ({
  expanded,
  setExpanded,
}: {
  expanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
}) => {
  const [files, setFiles] = useAtom(maxFileAtom);
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
        className="absolute w-[25%] top-0 h-full z-50 bg-[#ffffff] transition-all"
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
              {files.map(({ originalFile, type, loaded }) => (
                <div className="text-sm my-1">
                  <p className="text-gray-500">{type}</p>
                  <span>{originalFile.name}</span>
                  <span className="ml-1" style={{color: loaded ? 'blue' : 'red'}}>{loaded ? '로드 됨' : '로드 안됨'}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default MaxPageRightBar;
