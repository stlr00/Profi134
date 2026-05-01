import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQConsumerService } from './rabbitmq-consumer.service';
import { MessageProcessorModule } from '../message-processor/message-processor.module';

@Module({
  imports: [MessageProcessorModule],
  providers: [
    RabbitMQConsumerService,
    {
      provide: 'CONSUMER_CONFIG',
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('consumer.rabbitmq.url'),
        prefetchCount: configService.get<number>('consumer.rabbitmq.prefetchCount'),
        reconnectTimeInSeconds: configService.get<number>(
          'consumer.rabbitmq.reconnectTimeInSeconds',
        ),
        maxRetryAttempts: configService.get<number>('consumer.retries.maxAttempts'),
        retryDelayMs: configService.get<number>('consumer.retries.delayMs'),
      }),
      inject: [ConfigService],
    },
  ],
})
export class RabbitMQConsumerModule {}
