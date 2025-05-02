const S3_BASE_URL = import.meta.env.VITE_MAX_URL;
const DEFAULT_PATH =  S3_BASE_URL + 'projects/test3/'
export const MaxConstants = {
  base: S3_BASE_URL,
  DEFAULT_PATH: DEFAULT_PATH,
  IMAGE_PATH: DEFAULT_PATH + 'images/',
  TEXTURE_PATH: DEFAULT_PATH + 'textures/',
  GEOMETRY_PATH: DEFAULT_PATH + 'geometry/',
  MATERIAL_PATH: DEFAULT_PATH + 'material/',
}