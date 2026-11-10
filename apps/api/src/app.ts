import Fastify from 'fastify';
import type { HealthResponse } from '@cipherquiz/shared';

export interface AppOptions {
  checkDatabase?: () => Promise<void>;
  logger?: boolean;
}
export function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false });
  app.get('/health/live', async (): Promise<HealthResponse> => ({
    status: 'ok',
    service: 'cipherquiz-api',
  }));
  app.get('/health/ready', async (_request, reply): Promise<HealthResponse> => {
    try {
      if (!options.checkDatabase) throw new Error('Database not configured');
      await options.checkDatabase();
      return { status: 'ok', service: 'cipherquiz-api' };
    } catch {
      reply.code(503);
      return { status: 'unavailable', service: 'cipherquiz-api' };
    }
  });
  return app;
}
