import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { NotificationsModule } from './notifications/notifications.module';
import producerConfig from './config/producer.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [producerConfig],
      envFilePath: ['.env', 'apps/producer/.env'],
    }),
    RabbitMQModule,
    NotificationsModule,
  ],
})
export class ProducerModule {}
