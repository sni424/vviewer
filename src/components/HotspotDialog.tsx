import { useAtomValue } from 'jotai';
import { hotspotImage } from '../Constants';
import { hotspotAtom } from '../scripts/atoms';

function HotspotDialog({ index }: { index: number }) {
  const hotspots = useAtomValue(hotspotAtom);
  const hotspot = hotspots.find(hotspot => hotspot.index === index);
  if (!hotspot) {
    console.error(
      '찾을 수 없는 핫스팟 : ',
      index,
      ' from ',
      hotspots.map(h => h.index).join(','),
    );
    return null;
  }

  const c = hotspot.content;
  const {
    title = '제목',
    header = '',
    headerDetail = '',
    image = '',
    footer = [],
    price = '',
  } = c;
  return (
    <div className="text-gray010 md:max-w-[320px]">
      <div className="pl-[16px] pr-[16px] pb-[32px] rounded-t-[16px] flex flex-col justify-center bg-gray080/80">
        <div
          className=" pt-[24px] pb-[8px] text-[14px] text-center"
          style={{
            fontSize: 14,
            lineHeight: '13.72px',
            fontWeight: 500,
          }}
        >
          {title}
        </div>
        <div className="mt-[24px]">
          <div
            style={{
              fontSize: '12px',
              lineHeight: '11.76px',
            }}
          >
            {header}
          </div>
          <div
            style={{
              fontSize: '10px',
              lineHeight: '9.8px',
            }}
          >
            {headerDetail}
          </div>
        </div>
        <div className="mt-[16px] h-[240px] w-full">
          <img
            src={hotspotImage(image)}
            alt={title}
            className="w-full h-full object-contain"
          />
        </div>
        <ul
          className={`grid grid-cols-${footer.filter(each => each.trim().length > 0).length} mb-[16px]`}
        >
          {footer.map((f, i) => {
            return (
              <li key={`hotspot-footer-grid-${i}`}>
                {f
                  .split('\n')
                  .filter(line => line.trim().length > 0)
                  .map((line, j) => (
                    <div key={`hotspot-footer-grid-${i}-${j}`}>
                      {line.trim()}
                    </div>
                  ))}
              </li>
            );
          })}
        </ul>
        <div className="mt-[16px] text-right">
          {price
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map((line, i) => (
              <div key={`hotspot-price-${i}`}>{line.trim()}</div>
            ))}
        </div>
      </div>
      <div className="flex items-center justify-center rounded-b-[16px] pt-[16px] pb-[16px] text-gray080 bg-gray010/80">
        닫기
      </div>
    </div>
  );
}

export default HotspotDialog;
