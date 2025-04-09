// useRegion.ts
import { useEffect, useState } from 'react';
import { setENV } from 'src/Constants';

export type Region = 'korea' | 'vietnam' | 'unknown';

export const useRegion = () => {
  const cached = localStorage.getItem('region');
  if (['korea', 'vietnam'].includes(cached ?? '')) {
    setENV(cached as any);
  }
  const [region, setRegion] = useState<Region>((cached as Region) ?? 'unknown');

  useEffect(() => {
    if (!cached) {
      const fetchLocation = async () => {
        try {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();

          const userLat = data.latitude;
          const userLon = data.longitude;

          const korea = { lat: 37.5665, lon: 126.978 }; // Seoul
          const vietnam = { lat: 21.0285, lon: 105.8542 }; // Hanoi

          const distToKorea = getDistance(
            userLat,
            userLon,
            korea.lat,
            korea.lon,
          );
          const distToVietnam = getDistance(
            userLat,
            userLon,
            vietnam.lat,
            vietnam.lon,
          );

          const region = distToKorea < distToVietnam ? 'korea' : 'vietnam';
          setENV(region);
          setRegion(region);
          localStorage.setItem('region', region);
        } catch (err) {
          console.error('Geo detection failed', err);
          setRegion('unknown');
        }
      };

      fetchLocation();
    }
  }, []);

  return region;
};

const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
