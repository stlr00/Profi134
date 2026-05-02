import { registerAs } from '@nestjs/config';

export default registerAs('producer', () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    reconnectTimeInSeconds:
      parseInt(process.env.RABBITMQ_RECONNECT_TIME, 10) || 5,
    heartbeatIntervalInSeconds:
      parseInt(process.env.RABBITMQ_HEARTBEAT, 10) || 60,
  },
}));
