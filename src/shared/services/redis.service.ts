import { redis } from "@config/redis";

export class RedisService {
  /**
   * Lock distribuido usando SETNX con expiración automática (TTL)
   */
  static async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await redis.set(key, "LOCKED", "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  /**
   * Libera un lock explícitamente
   */
  static async releaseLock(key: string): Promise<void> {
    await redis.del(key);
  }

  /**
   * Verifica y marca idempotencia para un webhook (evita duplicados)
   */
  static async setWebhookProcessed(eventId: string): Promise<boolean> {
    const key = `webhook:onvo:${eventId}`;
    const result = await redis.set(key, "PROCESSED", "EX", 86400, "NX"); // 24 horas
    return result === "OK";
  }
}
