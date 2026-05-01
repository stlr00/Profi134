import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Logger,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import { Exchange, Queue, RoutingKey } from '@app/shared';
import { NotificationEvent } from '@app/shared';
import { MessageProcessorService } from '../message-processor/message-processor.service';

interface ConsumerConfig {
  url: string;
  prefetchCount: number;
  reconnectTimeInSeconds: number;
  maxRetryAttempts: number;
  retryDelayMs: number;
}

@Injectable()
export class RabbitMQConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConsumerService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @Inject('CONSUMER_CONFIG') private readonly config: ConsumerConfig,
    private readonly messageProcessor: MessageProcessorService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.logger.log(`Connecting to RabbitMQ at ${this.config.url}`);
      this.connection = await amqp.connect(this.config.url);

      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err.message);
        this.scheduleReconnect();
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, reconnecting...');
        this.scheduleReconnect();
      });

      this.channel = await this.connection.createChannel();
      await this.setupTopology();
      await this.startConsuming();

      this.isConnecting = false;
      this.logger.log(
        'Successfully connected to RabbitMQ and started consuming',
      );
    } catch (error) {
      this.isConnecting = false;
      this.logger.error('Failed to connect to RabbitMQ', error.message);
      this.scheduleReconnect();
    }
  }

  private async setupTopology(): Promise<void> {
    if (!this.channel) return;

    await this.channel.assertExchange(Exchange.DLX, 'direct', {
      durable: true,
    });
    await this.channel.assertQueue(Queue.NOTIFICATIONS_DLQ, {
      durable: true,
      arguments: { 'x-queue-type': 'classic' },
    });
    await this.channel.bindQueue(
      Queue.NOTIFICATIONS_DLQ,
      Exchange.DLX,
      RoutingKey.DLQ,
    );

    await this.channel.assertExchange(Exchange.NOTIFICATIONS, 'direct', {
      durable: true,
    });
    await this.channel.assertQueue(Queue.NOTIFICATIONS, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': Exchange.DLX,
        'x-dead-letter-routing-key': RoutingKey.DLQ,
        'x-message-ttl': 86400000,
        'x-queue-type': 'classic',
      },
    });
    await this.channel.bindQueue(
      Queue.NOTIFICATIONS,
      Exchange.NOTIFICATIONS,
      RoutingKey.NOTIFICATION,
    );

    await this.channel.prefetch(this.config.prefetchCount);
  }

  private async startConsuming(): Promise<void> {
    if (!this.channel) return;

    this.logger.log(`Started consuming from queue: ${Queue.NOTIFICATIONS}`);

    await this.channel.consume(Queue.NOTIFICATIONS, async (msg) => {
      if (!msg) return;

      let event: NotificationEvent;

      try {
        event = JSON.parse(msg.content.toString()) as NotificationEvent;
      } catch (parseError) {
        this.logger.error(
          'Failed to parse message, rejecting without requeue',
          parseError.message,
        );
        this.channel?.nack(msg, false, false);
        return;
      }

      const retryCount =
        (msg.properties.headers?.['x-retry-count'] as number) || 0;

      try {
        this.logger.log(
          `Processing message ${event.id} (attempt ${retryCount + 1})`,
        );
        await this.messageProcessor.process({ ...event, retryCount });
        this.channel?.ack(msg);
        this.logger.log(`Message ${event.id} processed and acknowledged`);
      } catch (processingError) {
        this.logger.error(
          `Failed to process message ${event.id} (attempt ${retryCount + 1})`,
          processingError.message,
        );

        if (retryCount < this.config.maxRetryAttempts - 1) {
          await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));
          await this.requeueWithRetry(msg, event, retryCount + 1);
        } else {
          this.logger.error(
            `Message ${event.id} exhausted ${this.config.maxRetryAttempts} retry attempts, sending to DLQ`,
          );
          this.channel?.nack(msg, false, false);
        }
      }
    });
  }

  private async requeueWithRetry(
    originalMsg: amqp.Message,
    event: NotificationEvent,
    newRetryCount: number,
  ): Promise<void> {
    if (!this.channel) return;

    this.channel.ack(originalMsg);

    const message = Buffer.from(
      JSON.stringify({ ...event, retryCount: newRetryCount }),
    );
    this.channel.publish(
      Exchange.NOTIFICATIONS,
      RoutingKey.NOTIFICATION,
      message,
      {
        persistent: true,
        contentType: 'application/json',
        messageId: event.id,
        headers: {
          'x-retry-count': newRetryCount,
        },
      },
    );

    this.logger.log(
      `Message ${event.id} requeued with retry count ${newRetryCount}`,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.disconnect();
      await this.connect();
    }, this.config.reconnectTimeInSeconds * 1000);
  }

  private async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (error) {
      this.logger.error('Error during disconnect', error.message);
    }
  }
}
