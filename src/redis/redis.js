import Redis from 'ioredis';

// Docker Compose automatically passes this down via environment variables
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.error("❌ REDIS_URL is not defined in the environment variables!");
}

// Initialize the client connection instance
const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        // Automatically attempts reconnection if it drops
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redis.on('connect', () => {
    console.log('🚀 Redis Connected successfully to the docker container!');
});

redis.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err);
});

export default redis;