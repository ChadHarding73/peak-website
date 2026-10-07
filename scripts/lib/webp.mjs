// WebP copies sit beside each JPG/PNG in src/images (same stem, .webp). Pages are rewritten to the
// copy at build time; the originals stay published so old URLs and og:image previews keep working.
const RASTER = /\.(png|jpe?g)$/i;

export const isRaster = p => RASTER.test(p);
export const webpSibling = p => p.replace(RASTER, '.webp');

// Rewrite src="/images/..." and url('/images/...') to the .webp sibling when hasWebp(path) says it exists.
// href and content attributes are left alone, so og:image and download links still point at the original.
export function toWebpRefs(html, hasWebp) {
  const swap = path => (isRaster(path) && hasWebp(path) ? webpSibling(path) : path);
  return html
    .replace(/(\ssrc=")(\/images\/[^"?#]+)"/g, (m, pre, path) => `${pre}${swap(path)}"`)
    .replace(/url\((['"]?)(\/images\/[^'")?#]+)\1\)/g, (m, q, path) => `url(${q}${swap(path)}${q})`);
}
