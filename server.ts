import * as crypto from 'crypto';
import { mkdirSync } from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import { basename, dirname, join, normalize } from 'path';

function stringTo24Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 24);
}

function createObjectId(input: string): ObjectId {
  const hex = stringTo24Hex(input);
  return new ObjectId(hex);
}
const PORT = 4000;
const ALLOWED_ORIGIN = 'http://localhost:5173';
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

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle OPTIONS preflight request
    if (
      req.method === 'OPTIONS' &&
      (url.pathname === '/save' || url.pathname === '/retrieve')
    ) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle POST /save
    if (req.method === 'POST' && url.pathname === '/save') {
      try {
        // Parse multipart/form-data
        const formData = await req.formData();
        const data = formData.get('data');
        const filepath = formData.get('filepath');
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
        const filepath = url.searchParams.get('filepath');
        if (!filepath) {
          return new Response(
            JSON.stringify({ error: 'Missing filepath query parameter' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            },
          );
        }

        const safePath = normalize(filepath).replace(/^(\.\.[\/\\])+/, '');

        const document = await collection.findOne({
          _id: createObjectId(safePath),
        });
        if (!document) {
          return new Response(JSON.stringify({ error: 'File not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        if (document.type === 'json') {
          return new Response(JSON.stringify(document.data), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        } else if (document.type === 'binary') {
          const buffer = document.data.buffer; // MongoDB Binary to Buffer
          return new Response(buffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Data-Type': 'binary',
              ...corsHeaders,
            },
          });
        }
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
