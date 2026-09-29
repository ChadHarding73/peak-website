import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';
import { resolveFile, parseRedirects, matchRedirect } from './lib/resolve.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.webp': 'image/webp', '.gif': 'image/gif' };
const rules = existsSync('_site/_redirects') ? parseRedirects(readFileSync('_site/_redirects', 'utf8')) : [];

export function start(port = 8080) {
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    const r = matchRedirect(rules, path);
    if (r && r.status !== 200) { res.writeHead(r.status, { location: r.to }); return res.end(); }
    const file = resolveFile('_site', r ? r.to : path);
    if (!file) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise(ok => server.listen(port, () => ok(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] || 8080);
  await start(port);
  console.log(`http://localhost:${port}`);
}
