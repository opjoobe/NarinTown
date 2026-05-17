import { Redis } from 'ioredis';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(url, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

export const redisSub = new Redis(url, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});
