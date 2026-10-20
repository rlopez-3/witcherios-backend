import Redis from "ioredis";

export const redis = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    },
  },
);
