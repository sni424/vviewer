import { file, serve } from 'bun';
import path from 'path';

const port = 4173;

const pages = ['/test', '/mobile'];

// Serve static files from the Vite dist folder
serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const filePath = path.join(
      __dirname,
      './dist',
      pages.includes(url.pathname)
        ? 'index.html'
        : url.pathname === '/'
          ? 'index.html'
          : url.pathname,
    );

    // Serve the requested file or index.html for client-side routing
    console.log(' - ', filePath);
    try {
      return new Response(file(filePath));
    } catch {
      return new Response(file(path.join(__dirname, './dist', 'index.html')));
    }
  },
});

console.log(`Server running at http://localhost:${port}`);
