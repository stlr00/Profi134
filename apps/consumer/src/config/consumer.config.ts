import { registerAs } from '@nestjs/config';

export default registerAs('consumer', () => ({
  port: parseInt(process.env.PORT, 10) || 3002,
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH, 10) || 10,
    reconnectTimeInSeconds: parseInt(process.env.RABBITMQ_RECONNECT_TIME, 10) || 5,
  },
  retries: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS, 10) || 3,
    delayMs: parseInt(process.env.RETRY_DELAY_MS, 10) || 1000,
  },
  telegram: {
    serviceUrl: process.env.TELEGRAM_SERVICE_URL || 'http://telegram:3003',
  },
}));
