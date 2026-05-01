import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';

@Global()
@Module({
  providers: [
    RabbitMQService,
    {
      provide: 'RABBITMQ_CONFIG',
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('producer.rabbitmq.url'),
        reconnectTimeInSeconds: configService.get<number>(
          'producer.rabbitmq.reconnectTimeInSeconds',
        ),
        heartbeatIntervalInSeconds: configService.get<number>(
          'producer.rabbitmq.heartbeatIntervalInSeconds',
        ),
      }),
      inject: [ConfigService],
    },
  ],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
