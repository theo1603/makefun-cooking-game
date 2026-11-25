// Serve game/ on http://localhost:8080 for local play-testing.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };

createServer(async (req, res) => {
  const rawPath = req.url.split('?')[0];
  const path = rawPath === '/' ? '/index.html' : rawPath;
  // Never let a request climb out of game/.
  if (path.includes('..')) {
    res.writeHead(400);
    res.end('bad path');
    return;
  }
  try {
    const data = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(8080, () => console.log('Sizzle & Serve at http://localhost:8080'));
