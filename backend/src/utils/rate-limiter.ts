import { redis } from "../config/redis";

export const checkRateLimit = async (
  senderId: string,
  hourWindow: string,
  hourlyLimit: number
): Promise<{ allowed: boolean; currentCount: number }> => {
  const key = `ratelimit:${senderId}:${hourWindow}`;
  
  // Use a transaction pipeline for atomic increment and expire
  const multi = redis.multi();
  multi.incr(key);
  multi.expire(key, 3600 * 2); // keep for 2 hours
  const results = await multi.exec();

  if (!results) {
    throw new Error("Redis transaction failed in rate limiter");
  }

  const currentCount = results[0][1] as number;

  if (currentCount > hourlyLimit) {
    // Revert the increment since we're blocking it
    await redis.decr(key);
    return { allowed: false, currentCount: currentCount - 1 };
  }

  return { allowed: true, currentCount };
};

export const hasSentSlackNotification = async (
  senderId: string,
  hourWindow: string
): Promise<boolean> => {
  const key = `slack-notified:${senderId}:${hourWindow}`;
  const exists = await redis.exists(key);
  
  if (!exists) {
    await redis.setex(key, 3600 * 2, "1");
    return false;
  }
  return true;
};
