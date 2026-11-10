import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';
import { readConfig } from '../src/config.js';

test('liveness works without PostgreSQL; readiness fails closed without configuration', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  const live = await app.inject('/health/live');
  assert.equal(live.statusCode, 200);
  assert.equal(live.json().status, 'ok');
  assert.equal((await app.inject('/health/ready')).statusCode, 503);
});
test('readiness reflects dependency availability without leaking database errors', async (t) => {
  let available = true;
  const app = buildApp({
    checkDatabase: async () => {
      if (!available) throw new Error('sensitive connection information');
    },
  });
  t.after(() => app.close());
  assert.equal((await app.inject('/health/ready')).statusCode, 200);
  available = false;
  const result = await app.inject('/health/ready');
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.json(), {
    status: 'unavailable',
    service: 'cipherquiz-api',
  });
});
test('invalid ports fail at startup', () => {
  for (const PORT of ['0', '65536', 'abc', '1.5'])
    assert.throws(() => readConfig({ PORT }));
  assert.equal(readConfig({}).port, 3001);
});
