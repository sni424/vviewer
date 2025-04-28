import { useState } from 'react';
import * as THREE from 'VTHREE';
import SparkMD5 from 'spark-md5';

const FileTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [hashes, setHashes] = useState<{ md5: string[]; sha256: string[] }>({
    md5: [],
    sha256: [],
  });
  const [timeSpent, setTimeSpent] = useState<{
    buffer: number;
    md5: number;
    sha256: number;
  }>({
    buffer: 0,
    md5: 0,
    sha256: 0,
  });
  const url =
    'https://vra-configurator-dev.s3.ap-northeast-2.amazonaws.com/jonghyeok/image2.png';

  // ArrayBuffer를 hex 문자열로 변환
  const bufferToHex = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const calculateMD5 = (data: ArrayBuffer): string => {
    const spark = new SparkMD5.ArrayBuffer();
    spark.append(data);
    return spark.end();
  };

  // SHA-256 해시 계산
  const calculateSHA256 = async (data: ArrayBuffer): Promise<string> => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bufferToHex(hashBuffer);
  };

  const fixedUUID = 'FIXED_UUID';
  const fixedUUID2 = 'FIXED_UUID2';

  // 텍스처 속성과 이미지 데이터를 결합한 ArrayBuffer 추출
  const getTextureBuffer = (texture: THREE.Texture): ArrayBuffer | null => {
    // 1. 속성 추출
    const properties = {
      name: texture.name,
      uuid: texture.uuid,
      format: texture.format,
      type: texture.type,
      magFilter: texture.magFilter,
      minFilter: texture.minFilter,
      wrapS: texture.wrapS,
      wrapT: texture.wrapT,
      matrixAutoUpdate: texture.matrixAutoUpdate,
      offset: [texture.offset.x, texture.offset.y],
      repeat: [texture.repeat.x, texture.repeat.y],
      rotation: texture.rotation,
      flipY: texture.flipY,
      unpackAlignment: texture.unpackAlignment,
      // sourceFile: texture.sourceFile, // three.js 버전에 따라 다를 수 있음
    };
    const propStr = JSON.stringify(properties);

    // 2. 이미지 데이터 추출
    const image = texture.image;
    let imageBuffer: ArrayBuffer | null = null;
    if (image instanceof HTMLImageElement) {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(image, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        imageBuffer = imageData.data.buffer;
      }
    }

    if (!imageBuffer) {
      console.error('Failed to extract image buffer');
      return null;
    }

    // 3. 속성과 이미지 데이터를 결합
    const propBuffer = new TextEncoder().encode(propStr).buffer;
    const combined = new Uint8Array(propBuffer.byteLength + imageBuffer.byteLength);
    combined.set(new Uint8Array(propBuffer), 0);
    combined.set(new Uint8Array(imageBuffer), propBuffer.byteLength);

    return combined.buffer;
  };

  async function doTest() {
    setLoading(true);
    try {
      const loader = new THREE.TextureLoader();
      const t1 = await loader.loadAsync(url);
      t1.uuid = fixedUUID;
      t1.source.uuid = fixedUUID;
      const t2 = await loader.loadAsync(url);
      t2.uuid = fixedUUID2;
      t2.source.uuid = fixedUUID2;
      const meta1 = {textures: {}, images: {}}
      const meta2 = {textures: {}, images: {}}

      // t1.toJSON(meta1);
      // t1.name = t1.name + 'eweqewq';
      // t1.toJSON(meta2);

      // console.log(meta1, meta2);

      // 시간 측정 시작
      let startTime: number;

      // JSON을 바이너리(ArrayBuffer)로 변환
      startTime = performance.now();
      // JSON을 바이너리(ArrayBuffer)로 변환
      // const json1Str = JSON.stringify(meta1);
      // const json2Str = JSON.stringify(meta2);
      // const buffer1 = new TextEncoder().encode(json1Str).buffer;
      // const buffer2 = new TextEncoder().encode(json2Str).buffer;
      const buffer1 = getTextureBuffer(t1);
      const buffer2 = getTextureBuffer(t2);
      if (!buffer1 || !buffer2) {
        throw new Error('Failed to extract texture buffers');
      }
      const bufferTime = (performance.now() - startTime) / 1000; // 초 단위

      startTime = performance.now();
      const md5_1 = calculateMD5(buffer1);
      const md5_2 = calculateMD5(buffer2);
      const md5Time = (performance.now() - startTime) / 1000;

      // SHA-256 계산
      startTime = performance.now();
      const sha256_1 = await calculateSHA256(buffer1);
      const sha256_2 = await calculateSHA256(buffer2);
      const sha256Time = (performance.now() - startTime) / 1000;

      // 해시 저장
      setHashes({
        md5: [md5_1, md5_2],
        sha256: [sha256_1, sha256_2],
      });

      // 시간 저장
      setTimeSpent({
        buffer: bufferTime,
        md5: md5Time,
        sha256: sha256Time,
      });
    } catch (error) {
      console.error('Error during test:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-2">
      <span>파일 테스트</span>
      <button onClick={doTest} disabled={loading}>
        {loading ? 'Loading...' : 'TEST!'}
      </button>
      <div>
        <p>MD5 Hash 1: {hashes.md5[0] || 'N/A'}</p>
        <p>MD5 Hash 2: {hashes.md5[1] || 'N/A'}</p>
        <p>SHA-256 Hash 1: {hashes.sha256[0] || 'N/A'}</p>
        <p>SHA-256 Hash 2: {hashes.sha256[1] || 'N/A'}</p>
        <p>
          MD5 Match:{' '}
          {hashes.md5[0] && hashes.md5[1]
            ? hashes.md5[0] === hashes.md5[1]
              ? 'Yes'
              : 'No'
            : 'N/A'}
        </p>
        <p>
          SHA-256 Match:{' '}
          {hashes.sha256[0] && hashes.sha256[1]
            ? hashes.sha256[0] === hashes.sha256[1]
              ? 'Yes'
              : 'No'
            : 'N/A'}
        </p>
        <strong>
          timeSpent
        </strong>
        <p>
          buffer: {timeSpent.buffer}s
        </p>
        <p>
          md5: {timeSpent.md5}s
        </p>
        <p>
          sha256: {timeSpent.sha256}s
        </p>
      </div>
    </div>
  );
};

export default FileTest;
