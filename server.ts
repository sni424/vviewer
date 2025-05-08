import * as crypto from 'crypto';
import { mkdirSync } from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import { basename, dirname, join, normalize } from 'path';

const TYPED_ARRAYS = {
  Int8Array: Int8Array,
  Uint8Array: Uint8Array,
  Uint8ClampedArray: Uint8ClampedArray,
  Int16Array: Int16Array,
  Uint16Array: Uint16Array,
  Int32Array: Int32Array,
  Uint32Array: Uint32Array,
  Float32Array: Float32Array,
  Float64Array: Float64Array,
};

const TYPED_ARRAY_NAMES = Object.keys(
  TYPED_ARRAYS,
) as (keyof typeof TYPED_ARRAYS)[];
type TYPED_ARRAY_NAME = keyof typeof TYPED_ARRAYS;

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

type DataArray = ArrayBuffer | TypedArray;

const isDataArray = (obj?: any): boolean => {
  if (obj instanceof ArrayBuffer) return true;
  if (isTypedArray(obj)) return true;

  return false;
};

function isTypedArray(value: any): value is TypedArray {
  return (
    value instanceof Int8Array ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Int16Array ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof BigInt64Array ||
    value instanceof BigUint64Array
  );
}

function iterateWithPredicate<T = any>(
  obj: any,
  predicate: (val: any) => boolean,
  callback: (value: T, path: string[]) => void,
  path: string[] = [],
) {
  if (predicate(obj)) {
    callback(obj, path);
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) =>
      iterateWithPredicate(item, predicate, callback, [...path, String(index)]),
    );
  } else if (obj && typeof obj === 'object' && !isDataArray(obj)) {
    for (const [key, val] of Object.entries(obj)) {
      iterateWithPredicate(val, predicate, callback, [...path, key]);
    }
  }
}

type FileID = string;
// VFile대신 원격(또는 캐시)에 있는 파일을 레퍼런스로 사용할 때
type VRemoteFile = {
  isVRemoteFile: true; // 로컬에서 판단할 때 있으면 좋음
  id: FileID;
  format: 'json' | 'jpg' | 'png' | 'ktx' | 'buffer' | TYPED_ARRAY_NAME;
};

// 에셋매니저에서 로드할 수 있는 RemoteFile이거나 VFile
type VLoadable<T extends Record<any, any> = any> = VRemoteFile | VFile<T>;

export const VAssetTypes = [
  'VFile', // 일반 json파일
  'VScene', // THREE.Scene보다 포괄적인 개념. 하나의 옵션을 그리기 위한 모든 내용 포함
  'VOption',
  'VProject',

  // Three.js로 변환가능한 파일들
  'VBufferGeometry',
  'VTexture',
  'VSource', // texture 하위에서 사용되는 데이터 소스
  'VDataTexture',
  'VCompressedTexture',
  'VMaterial',
  'VObject3D', // THREE.Group === THREE.Object3D이다
  'VMesh',
] as const;
type VAssetType = (typeof VAssetTypes)[number];

// json객체
type VFile<T extends Record<any, any> = any> = {
  isVFile: true;
  id: FileID; // json url : workspace/project/files/[id] <- json파일
  type: VAssetType;
  data: T; // json객체
};

function isVFile(file?: any) {
  return Boolean(file?.isVFile);
}

function isVRemoteFile(file?: any) {
  return Boolean(file?.isVRemoteFile);
}

function stringTo24Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 24);
}

function createObjectId(input: string): ObjectId {
  const hex = stringTo24Hex(input);
  return new ObjectId(hex);
}
const PORT = 4000;
const ALLOWED_ORIGINS = [
  'http://localhost:4173',
  'http://localhost:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5173',
];
const MONGODB_URI = process.env.MONGO_URL!;
const DB_NAME = 'file_uploads';

if (!MONGODB_URI) {
  throw new Error('MONGO_URL environment variable is not set');
}

// MongoDB connection

async function connectToMongo() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');
  const db = client.db(DB_NAME);
  const collection = db.collection('files');
  return {
    client,
    db,
    collection,
  };
}

const { client, db, collection } = await connectToMongo();

function getCorsHeaders(origin: string | null): {} {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  } else {
    // Origin이 허용되지 않은 경우, CORS 헤더를 아예 주지 않거나 '*' 같은걸 주지 말 것
    return {};
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);

    // Handle OPTIONS preflight request
    if (
      req.method === 'OPTIONS' &&
      (url.pathname === '/save' || url.pathname === '/retrieve')
    ) {
      console.log('OPTIONS');
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle POST /save
    if (req.method === 'POST' && url.pathname === '/save') {
      console.log('POST,SAVE');
      try {
        // Parse multipart/form-data
        const formData = await req.formData();
        const data = formData.get('data');
        const filepath = formData.get('filepath');
        const format = formData.get('format') as '';
        const type: 'json' | 'binary' = formData.get('type') as
          | 'json'
          | 'binary';

        // Validate inputs
        if (
          !(data instanceof File) ||
          typeof filepath !== 'string' ||
          !['json', 'binary'].includes(type)
        ) {
          return new Response(
            JSON.stringify({
              error: 'Missing or invalid data, filepath, or type',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            },
          );
        }

        const safePath = normalize(filepath).replace(/^(\.\.[\/\\])+/, '');
        const filename = basename(safePath);
        const dirPath = dirname(safePath);
        const virtualPath = join(dirPath, filename);

        console.log(`Received: ${virtualPath}`);

        if (type === 'json') {
          // Handle JSON data
          const text = await data.text();
          let jsonData;
          try {
            jsonData = JSON.parse(text);
          } catch (parseError) {
            return new Response(
              JSON.stringify({ error: 'Invalid JSON data' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              },
            );
          }
          // Store JSON in MongoDB
          const _id = createObjectId(safePath);
          await collection.replaceOne(
            { _id },
            {
              _id,
              filepath: virtualPath,
              type: 'json',
              data: jsonData,
              createdAt: new Date(),
            },
            {
              upsert: true,
            },
          );
          console.log(`  - JSON document saved: ${virtualPath}`);
        } else {
          // Handle binary data
          const arrayBuffer = await data.arrayBuffer();
          // Store binary in MongoDB as Binary
          // await collection.insertOne({
          //   filepath: virtualPath,
          //   type: 'binary',
          //   data: new Binary(Buffer.from(arrayBuffer)),
          //   createdAt: new Date(),
          // });
          // console.log(`  - Binary document saved: ${virtualPath}`);

          // save to local
          const fs = Bun.file('public/' + safePath);
          mkdirSync('public/' + dirPath, { recursive: true });
          await fs.write(arrayBuffer);
          console.log(`  - Binary file saved: ${virtualPath}`);
          // const fs = Bun.file(virtualPath);
        }

        return new Response(
          JSON.stringify({ message: 'File saved', filepath: virtualPath }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        );
      } catch (error) {
        console.error('Error saving file:', error);
        return new Response(JSON.stringify({ error: 'Failed to save file' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Handle GET /retrieve
    if (req.method === 'GET' && url.pathname === '/retrieve') {
      try {
        const fileId = url.searchParams.get('fileId');
        const projectId = url.searchParams.get('projectId');
        const withChildren = url.searchParams.get('withChildren') === 'true';

        if (
          !fileId ||
          !projectId ||
          fileId === 'undefined' ||
          projectId === 'undefined'
        ) {
          console.error({ fileId, projectId });
          return new Response(
            JSON.stringify({
              error: 'Missing fileId or projectId query parameter',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            },
          );
        }

        const filepath = `${projectId}/${fileId}`;
        const getFilePath = (id: string) => `${projectId}/${id}`;
        const getItem = async (id: string) => {
          const innerPath = getFilePath(id);
          const safePath = normalize(innerPath).replace(/^(\.\.[\/\\])+/, '');

          const document = await collection.findOne({
            _id: createObjectId(safePath),
          });
          if (!document?.data) {
            console.error('File not found', id, document);
            return new Response(
              JSON.stringify({ error: 'Failed to retrieve file' }),
              {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              },
            );
          }
          return document!.data;
        };

        if (!withChildren) {
          try {
            const item = await getItem(fileId);
            return new Response(JSON.stringify(item), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
          } catch (e) {
            console.error('Error retrieving file:', e);
            return new Response(
              JSON.stringify({ error: 'Failed to retrieve file' }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              },
            );
          }
        }

        const vremotefiles: Set<VRemoteFile> = new Set();
        const vfiles: Set<VFile> = new Set();

        // VFile을 얻은 후 위의 children에 재귀적으로 자식을 채운다
        const getChildren = async (id: string) => {
          const document = await getItem(id);
          if (!document || !isVFile(document)) {
            console.error(
              'File not found @getChildren',
              id,
              document,
              'children of ',
              filepath,
            );
            throw new Error('Invalid VFile');
          }

          const file = document as VFile;
          vfiles.add(file);

          const proms: Promise<any>[] = [];

          iterateWithPredicate<VRemoteFile>(file, isVRemoteFile, value => {
            vremotefiles.add(value);
            if (value.format === 'json') {
              console.log('Children found : ', value);
              proms.push(getChildren(value.id).then(() => value.id));
            }
          });

          if (proms.length === 0) {
            return;
          }

          return Promise.all(proms).then(() => {
            return document;
          });
        };

        const retval = {
          self: await getChildren(fileId),
          vremotefiles: Array.from(vremotefiles),
          vfiles: Array.from(vfiles),
        };
        console.log('Final retval:', retval);

        return new Response(JSON.stringify(retval), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (error) {
        console.error('Error retrieving file:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve file' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        );
      }
    }

    // Handle invalid routes
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

console.log(`Server running at http://localhost:${PORT}`);
