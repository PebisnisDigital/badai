const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('marketing card downloads the WebP image and original WhatsApp text separately', async () => {
  const created = [];
  const downloads = [];
  const handlers = {};
  const fakeDocument = {
    body: { appendChild() {} },
    createElement(tag) {
      if (tag === 'details') return { dataset: {}, innerHTML: '', className: '' };
      return {
        set href(value) { this.url = value; },
        set download(value) { this.filename = value; },
        click() { downloads.push(this); },
        remove() {},
      };
    },
  };
  const root = {};
  const source = fs.readFileSync(path.join(__dirname, '../bikingameedukasi/marketing-ui.js'), 'utf8');
  vm.runInNewContext(source, {
    window: root,
    document: fakeDocument,
    Blob,
    URL: {
      createObjectURL(blob) { created.push(blob); return 'blob:download'; },
      revokeObjectURL() {},
    },
    setTimeout() {},
    fetch: async () => ({ ok: true, blob: async () => new Blob(['webp'], { type: 'image/webp' }) }),
  });

  const originalText = '*JUDUL*\n\nHalo, Bapak/Ibu! 😊\n_Coba sekarang._';
  const card = root.BADAI_MARKETING_RENDER({
    marketing: { number: 1, name: 'SURVIVAL' },
    imageUrl: 'https://example.com/poster.webp',
    text: originalText,
  }, 0, { document: fakeDocument, esc: (text) => text, fmt: (text) => text });
  assert.match(card.innerHTML, /data-marketing-download="1"/);
  assert.match(card.innerHTML, /data-marketing-text-download="1"/);
  assert.match(card.innerHTML, /data-copy-index="0"/);

  root.BADAI_MARKETING_SEARCH({
    addEventListener(name, listener) { handlers[name] = listener; },
  }, { addEventListener() {} }, {});

  const textButton = {
    dataset: { marketingTextDownload: '1' },
    closest(selector) { return selector === '.marketing-card' ? card : null; },
  };
  await handlers.click({ target: { closest(selector) { return selector.includes('text-download') ? textButton : null; } }, preventDefault() {} });
  assert.equal(downloads[0].filename, 'BADAI_Conversion_Card_01.txt');
  assert.equal(await created[0].text(), originalText);
  assert.deepEqual(Array.from(new Uint8Array(await created[0].arrayBuffer()).slice(0, 3)), [239, 187, 191]);

  const imageButton = {
    dataset: { marketingDownload: '1' },
    textContent: '↓ Unduh Gambar',
    closest(selector) { return selector === '.marketing-card' ? card : null; },
  };
  card.querySelector = () => ({ src: 'https://example.com/poster.webp' });
  await handlers.click({ target: { closest(selector) { return selector.includes('text-download') ? null : imageButton; } }, preventDefault() {} });
  assert.equal(downloads[1].filename, 'BADAI_Conversion_Card_01.webp');
  assert.equal(created[1].type, 'image/webp');
});
