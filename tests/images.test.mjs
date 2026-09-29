import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originalUrl, localName, assignNames, rewriteRefs } from '../scripts/lib/images.mjs';

test('originalUrl forces https and strips format query', () => {
  assert.equal(originalUrl('http://static1.squarespace.com/static/a/b/c.png?format=1500w'), 'https://static1.squarespace.com/static/a/b/c.png');
});

test('localName uses stem and normalized extension', () => {
  assert.equal(localName('https://images.squarespace-cdn.com/x/bleehbleh.png', 'mobohubb-acquired-by-guardhouse'), 'mobohubb-acquired-by-guardhouse.png');
  assert.equal(localName('https://images.squarespace-cdn.com/x/photo.JPEG', 'chad-harding'), 'chad-harding.jpg');
});

test('assignNames: same URL twice -> one name; different URLs, same stem -> suffixed (Review Focus 4)', () => {
  const m = assignNames([
    { url: 'https://images.squarespace-cdn.com/1/image.png', stem: 'acme' },
    { url: 'https://images.squarespace-cdn.com/1/image.png', stem: 'acme' },
    { url: 'https://images.squarespace-cdn.com/2/image.png', stem: 'acme' },
  ]);
  assert.equal(m.size, 2);
  assert.equal(m.get('https://images.squarespace-cdn.com/1/image.png'), 'acme.png');
  assert.equal(m.get('https://images.squarespace-cdn.com/2/image.png'), 'acme-2.png');
});

test('rewriteRefs replaces http, https and ?format variants', () => {
  const map = new Map([['https://images.squarespace-cdn.com/1/a.png', '/images/experience/acme.png']]);
  const text = 'image: https://images.squarespace-cdn.com/1/a.png\n<img src="http://images.squarespace-cdn.com/1/a.png?format=1000w">';
  assert.equal(rewriteRefs(text, map), 'image: /images/experience/acme.png\n<img src="/images/experience/acme.png">');
});

test('typeMatchesName rejects a WebP body saved under a .png name', async () => {
  const { typeMatchesName } = await import('../scripts/lib/images.mjs');
  assert.equal(typeMatchesName('acme.png', 'image/png'), true);
  assert.equal(typeMatchesName('acme.jpg', 'image/jpeg'), true);
  assert.equal(typeMatchesName('acme.png', 'image/webp'), false);
  assert.equal(typeMatchesName('acme.jpg', 'text/html; charset=utf-8'), false);
});

test('nameForType gives extension-less URLs an extension from the response type', async () => {
  const { nameForType } = await import('../scripts/lib/images.mjs');
  assert.equal(nameForType('7geese-2.bin', 'image/jpeg'), '7geese-2.jpg');
  assert.equal(nameForType('7geese-2.bin', 'image/png; charset=binary'), '7geese-2.png');
  assert.equal(nameForType('acme.png', 'image/png'), 'acme.png');
});

test('acceptFor requests exactly the type the URL extension names', async () => {
  const { acceptFor, ORIGINAL_ACCEPT } = await import('../scripts/lib/images.mjs');
  assert.equal(acceptFor('https://images.squarespace-cdn.com/x/a.webp'), 'image/webp');
  assert.equal(acceptFor('https://images.squarespace-cdn.com/x/a.PNG'), 'image/png');
  assert.equal(acceptFor('https://images.squarespace-cdn.com/x/a.jpeg'), 'image/jpeg');
  assert.equal(acceptFor('https://static1.squarespace.com/static/a/b/c/1713390837092/'), ORIGINAL_ACCEPT);
});
