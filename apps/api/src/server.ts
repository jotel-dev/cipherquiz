import { Pool } from 'pg';
import { buildApp } from './app.js';
import { readConfig } from './config.js';

const config = readConfig();
const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      max: 5,
      connectionTimeoutMillis: 2000,
      query_timeout: 2000,
    })
  : undefined;
const app = buildApp({
  logger: true,
  ...(pool
    ? {
        checkDatabase: async () => {
          await pool.query('SELECT 1');
        },
      }
    : {}),
});
pool?.on('error', () =>
  app.log.error('Unexpected idle PostgreSQL connection error'),
);
app.addHook('onClose', async () => {
  await pool?.end();
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close();
  });
}
try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
