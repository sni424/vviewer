const S3_BASE_URL = import.meta.env.VITE_MAX_URL;
/**
 * TEST7 => 재질 분할 전 최종본
 * TEST8 => 재질 분할 시작
 * TEST9 => 라이트맵 넣음
 * TEST10 => Glossiness Channel Invert + VRayDirt Fix
 * TEST14 => Viz4d 와 비교용
 * TEST15 => Viz4d max uv exported
 * TEST16 => Test 15 에서 Geometry 추출 시 Normal 계산 방식 수정본
 * TEST17 => Geometry Indexed
 * **/
const DEFAULT_PATH = S3_BASE_URL + 'projects/test30/';
const TEST_PATH = S3_BASE_URL + 'projects/test20/';
export const MaxConstants = {
  base: S3_BASE_URL,
  DEFAULT_PATH: DEFAULT_PATH,
  IMAGE_PATH: DEFAULT_PATH + 'images/',
  TEXTURE_PATH: DEFAULT_PATH + 'textures/',
  GEOMETRY_PATH: DEFAULT_PATH + 'geometry/',
  MATERIAL_PATH: DEFAULT_PATH + 'material/',
  OBJECT_PATH: DEFAULT_PATH + 'objects/',
};
