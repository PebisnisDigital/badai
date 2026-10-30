const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('PESONAFLIX schema is separate from BADAI membership with RLS enabled', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      'CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;' +
      'CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);' +
      'CREATE TABLE public.admin_team_members(id uuid PRIMARY KEY);' +
      'CREATE TABLE public.registrations(id uuid PRIMARY KEY);'
    );
    const migration = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/20261030122412_pesonaflix_commerce.sql'),
      'utf8'
    );
    await pg.exec(migration);
    const result = await pg.query(
      "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'pesonaflix_%' ORDER BY tablename"
    );
    assert.equal(result.rows.length, 6);
    assert.ok(result.rows.every(row => row.rowsecurity === true));
    const settings = await pg.query(
      'SELECT normal_price, sales_open, promo_enabled, commission_percent FROM public.pesonaflix_settings'
    );
    assert.equal(settings.rows.length, 1);
    assert.equal(settings.rows[0].normal_price, null);
    assert.equal(settings.rows[0].sales_open, false);
    assert.equal(settings.rows[0].promo_enabled, false);
    assert.equal(Number(settings.rows[0].commission_percent), 50);
    const membership = await pg.query(
      "SELECT COUNT(*)::int AS count FROM information_schema.columns WHERE table_name='registrations'"
    );
    assert.equal(membership.rows[0].count, 1);
  } finally {
    await pg.close();
  }
});
