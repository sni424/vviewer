const S3_BASE_URL = import.meta.env.VITE_MAX_URL;
/**
 * TEST7 => 재질 분할 전 최종본
 * TEST8 => 재질 분할 시작
 * TEST9 => 라이트맵 넣음
 * TEST10 => Glossiness Channel Invert
 * **/
const DEFAULT_PATH = S3_BASE_URL + 'projects/test9/';
export const MaxConstants = {
  base: S3_BASE_URL,
  DEFAULT_PATH: DEFAULT_PATH,
  IMAGE_PATH: DEFAULT_PATH + 'images/',
  TEXTURE_PATH: DEFAULT_PATH + 'textures/',
  GEOMETRY_PATH: DEFAULT_PATH + 'geometry/',
  MATERIAL_PATH: DEFAULT_PATH + 'material/',
};
