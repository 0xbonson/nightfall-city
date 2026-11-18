/**
 * Nightfall City: Vela Bay — Lightweight Static Dev Server
 * Built with Node.js 22 standard library (zero external dependencies).
 * Serves the offline 3D WebGL engine and assets on port 8080.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const baseDir = resolve(fileURLToPath(new URL('./game', import.meta.url)));

// Parse port from CLI flags, env var, or fallback to 8080
const cliArgs = process.argv.slice(2);
const portFlagIndex = cliArgs.indexOf('--port');
const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
const positionalPort = cliArgs.length > 0 && !cliArgs[0].startsWith('-') ? parseInt(cliArgs[0], 10) : NaN;

let designatedPort = 8080;
if (portFlagIndex !== -1 && cliArgs[portFlagIndex + 1]) {
  const p = parseInt(cliArgs[portFlagIndex + 1], 10);
  if (Number.isInteger(p) && p > 0 && p < 65536) designatedPort = p;
} else if (Number.isInteger(positionalPort) && positionalPort > 0 && positionalPort < 65536) {
  designatedPort = positionalPort;
} else if (Number.isInteger(envPort) && envPort > 0 && envPort < 65536) {
  designatedPort = envPort;
}

const MIME_MAP: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const parsedUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
  let targetPath: string;

  try {
    targetPath = decodeURIComponent(parsedUrl.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('400 Bad Request');
    return;
  }

  // Normalize route mappings
  if (targetPath.endsWith('/')) targetPath += 'index.html';
  if (targetPath.startsWith('/game/')) targetPath = targetPath.slice(5);
  else if (targetPath === '/game') targetPath = '/index.html';

  const fullFilePath = resolve(join(baseDir, normalize(targetPath)));

  // Sandbox protection against directory traversal
  if (fullFilePath !== baseDir && !fullFilePath.startsWith(baseDir + sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' }).end('403 Forbidden');
    return;
  }

  try {
    if (!existsSync(fullFilePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404 Not Found');
      return;
    }

    const fileStat = statSync(fullFilePath);
    if (!fileStat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404 Not Found');
      return;
    }

    const ext = extname(fullFilePath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileStat.size,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createReadStream(fullFilePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end('500 Internal Server Error');
  }
});

server.listen(designatedPort, '0.0.0.0', () => {
  const url = `http://localhost:${designatedPort}`;
  console.log(`[Nightfall City] Dev server active at: ${url}`);
  console.log(`[Nightfall City] Serving game directory: ${baseDir}`);

  // Open browser page if requested or interactive
  if (process.argv.includes('--open')) {
    const openerCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${openerCmd} ${url}`, () => {});
  }
});

const handleTermination = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', handleTermination);
process.on('SIGTERM', handleTermination);
