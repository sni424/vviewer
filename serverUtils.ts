// This is used for getting user input.

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ACCESS_KEY = process.env.AWS_ACCESS!;
const SECRET_KEY = process.env.AWS_SECRET!;
const bucketName = process.env.AWS_S3_BUCKET!;

if (!ACCESS_KEY || !SECRET_KEY || !bucketName) {
  console.error(
    'AWS_ACCESS and AWS_SECRET must be set in the environment variables.',
    {
      ACCESS_KEY,
      SECRET_KEY,
      bucketName,
    },
  );
  throw new Error(
    'AWS_ACCESS and AWS_SECRET must be set in the environment variables.',
  );
}
const _s3Client = new S3Client({
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  region: 'ap-northeast-2',
});

export async function uploadArrayBuffer(key: string, arrayBuffer: ArrayBuffer) {
  const buffer = Buffer.from(arrayBuffer); // ArrayBuffer → Buffer

  return _s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'application/octet-stream', // 필요 시 MIME 지정
    }),
  );
  // .then(_ => {
  //   console.log(` Buffer->S3 : ${key}`);
  //   return _;
  // });
}
