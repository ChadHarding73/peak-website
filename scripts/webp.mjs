// npm run webp: make a .webp copy (max 1600px wide, quality 80) beside every JPG/PNG in src/images
// that lacks one. Safe to re-run; existing copies are skipped. Run it after adding any new image.
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { isRaster, webpSibling } from './lib/webp.mjs';

const root = 'src/images';
let made = 0, before = 0, after = 0;
for (const dir of readdirSync(root)) {
  const d = join(root, dir);
  if (!statSync(d).isDirectory()) continue;
  for (const name of readdirSync(d)) {
    const src = join(d, name), out = webpSibling(src);
    if (!isRaster(name) || existsSync(out)) continue;
    await sharp(src).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toFile(out);
    made++; before += statSync(src).size; after += statSync(out).size;
  }
}
console.log(made ? `Made ${made} WebP copies: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB` : 'Every image already has a WebP copy.');
