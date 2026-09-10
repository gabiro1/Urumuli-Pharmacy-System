import Queue from 'bull';
import { getRedisClient } from '../config/redis.js';

const queues = {};

function getRedisConfig() {
  const client = getRedisClient();
  return {
    redis: {
      port: client.options.port,
      host: client.options.host,
      username: client.options.username || undefined,
      password: client.options.password || undefined,
      ...(client.options.tls ? { tls: client.options.tls } : {}),
    },
  };
}

export function getQueue(name) {
  if (!queues[name]) {
    queues[name] = new Queue(name, getRedisConfig());
  }
  return queues[name];
}

export async function addJob(queueName, jobType, data, options = {}) {
  const queue = getQueue(queueName);
  return queue.add(jobType, data, {
    attempts: options.attempts || 3,
    backoff: options.backoff || { type: 'exponential', delay: 2000 },
    removeOnComplete: options.removeOnComplete || 100,
    removeOnFail: options.removeOnFail || 50,
    ...options,
  });
}

export async function closeAllQueues() {
  for (const [name, queue] of Object.entries(queues)) {
    await queue.close();
    delete queues[name];
  }
}

process.on('SIGTERM', async () => {
  await closeAllQueues();
});

process.on('SIGINT', async () => {
  await closeAllQueues();
});
