import app from './app.js';
import { env } from './config/env.js';
import { getPool, healthCheck } from './config/database.js';
import { getRedisClient, closeRedis, healthCheckRedis } from './config/redis.js';
import { closeAllQueues } from './services/queue.service.js';
import { registerScheduledWorkers } from './workers/scheduled.js';

let server;

async function initializeServices() {
  const dbHealthy = await healthCheck();
  if (!dbHealthy) {
    console.error('Database connection failed. Exiting.');
    process.exit(1);
  }
  console.log('Database connected successfully');

  try {
    getRedisClient();
    const redisHealthy = await healthCheckRedis();
    console.log(`Redis connected: ${redisHealthy}`);

    if (redisHealthy) {
      registerScheduledWorkers();
    } else {
      console.warn('Redis unavailable; scheduled background workers will not start.');
    }
  } catch (error) {
    console.warn('Redis connection failed, continuing without cache or workers:', error.message);
  }
}

async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('HTTP server closed. Draining in-flight requests...');

      try {
        await closeAllQueues();
        console.log('Job queues closed');
      } catch (error) {
        console.error('Error closing job queues:', error);
      }

      try {
        await closeRedis();
        console.log('Redis connection closed');
      } catch (error) {
        console.error('Error closing Redis:', error);
      }

      try {
        const pool = getPool();
        await pool.end();
        console.log('Database pool closed');
      } catch (error) {
        console.error('Error closing database pool:', error);
      }

      process.exit(0);
    });

    setTimeout(() => {
      console.error('Shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  setTimeout(() => process.exit(1), 1000);
});

initializeServices()
  .then(() => {
    server = app.listen(env.PORT, () => {
      server.keepAliveTimeout = 65000;
      server.headersTimeout = 66000;
      console.log(`Urumuli Prescription System API running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`API Base: http://localhost:${env.PORT}/api/v1`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  });
