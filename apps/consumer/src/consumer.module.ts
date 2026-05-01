import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQConsumerModule } from './rabbitmq/rabbitmq-consumer.module';
import { MessageProcessorModule } from './message-processor/message-processor.module';
import { TelegramClientModule } from './telegram-client/telegram-client.module';
import consumerConfig from './config/consumer.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [consumerConfig],
      envFilePath: ['.env', 'apps/consumer/.env'],
    }),
    TelegramClientModule,
    MessageProcessorModule,
    RabbitMQConsumerModule,
  ],
})
export class ConsumerModule {}
