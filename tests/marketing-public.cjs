const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('51 marketing cards load without admin session, while editor stays locked', async () => {
  const calls = [];
  const nodes = new Map();
  const element = () => ({
    hidden: false,
    textContent: '',
    dataset: {},
    addEventListener() {},
  });
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, element());
      return nodes.get(id);
    },
  };
  const cards = Array.from({ length: 51 }, (_, i) => ({
    who: 'vini',
    at: '19:30',
    text: `Copywriting kartu ${i + 1}`,
    marketing: { number: i + 1, name: `Trigger ${i + 1}` },
    imageUrl: `https://example.com/card-${i + 1}.webp`,
  }));
  const root = {
    localStorage: { getItem() { return null; } },
    setInterval() {},
  };
  const code = fs.readFileSync(path.join(__dirname, '../bikingameedukasi/editor.js'), 'utf8');
  vm.runInNewContext(code, {
    window: root,
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => [{ day: 5, revision: 3, content: cards }] };
    },
  });
  let renders = 0;
  const catalog = { 1: [], 2: [], 3: [], 5: [] };
  const editor = root.BadaiEditor.create({
    document,
    catalog,
    getDay: () => 5,
    getItems: () => catalog[5],
    chat: { addEventListener() {}, querySelector() { return null; } },
    render() { renders++; },
  });

  await editor.mount();
  assert.equal(catalog[5].length, 51);
  assert.equal(catalog[5][0].imageUrl, 'https://example.com/card-1.webp');
  assert.equal(catalog[5][50].marketing.number, 51);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /day=eq\.5&select=day,revision,content/);
  assert.ok(calls[0].options.headers.apikey);
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(editor.canEdit(), false);
  assert.equal(nodes.get('editorToggle').hidden, true);
  assert.match(nodes.get('editorStatus').textContent, /publik.*tanpa login/i);
  assert.equal(renders, 1);
});

test('public migration grants column-limited read on day 5 only', () => {
  const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261026033007_public_marketing_read.sql'), 'utf8');
  assert.match(migration, /grant select \(day, revision, content\)[\s\S]*to anon/i);
  assert.match(migration, /for select to anon\s+using \(day = 5\)/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete|all)\b[\s\S]*to anon/i);
});
