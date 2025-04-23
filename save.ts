import { mkdir } from 'fs/promises';
import { basename, dirname, join, normalize } from 'path';

const PORT = 4000;
const OUTPUT_DIR = './public';
const ALLOWED_ORIGIN = 'http://localhost:5173';

// Ensure output directory exists
await mkdir(OUTPUT_DIR, { recursive: true }).catch(() => {});

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    // Handle OPTIONS preflight request
    if (
      req.method === 'OPTIONS' &&
      req.url === `http://localhost:${PORT}/save`
    ) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle POST /save
    if (req.method !== 'POST' || req.url !== `http://localhost:${PORT}/save`) {
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders,
      });
    }

    try {
      // Parse multipart/form-data
      const formData = await req.formData();
      const data = formData.get('data');
      const filepath = formData.get('filepath');
      const type: 'json' | 'binary' = formData.get('type');

      // !TODO : 서버에서 타입에 따라 vremotefile을 json 또는 binary로 저장

      // Validate inputs
      if (!(data instanceof File) || typeof filepath !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid data or filepath' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        );
      }

      const safePath = normalize(filepath).replace(/^(\.\.[\/\\])+/, '');
      let filename = basename(safePath);

      const dirPath = dirname(safePath);
      const outputDirPath = join(OUTPUT_DIR, dirPath);
      // console.log({ dirPath, outputDirPath });
      const filePath = join(OUTPUT_DIR, dirPath, filename);

      await mkdir(outputDirPath, { recursive: true });
      console.log(`Received: ${filePath}`);

      // Write binary data
      const arrayBuffer = await data.arrayBuffer();
      await Bun.file(filePath).write(arrayBuffer);
      console.log(`  - File saved: ${filePath}`);

      return new Response(JSON.stringify({ message: 'File saved', filePath }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      console.error('Error saving file:', error);
      return new Response(JSON.stringify({ error: 'Failed to save file' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
});

console.log(`Server running at http://localhost:${PORT}`);
