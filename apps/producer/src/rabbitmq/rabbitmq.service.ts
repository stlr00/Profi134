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

interface RabbitMQConfig {
  url: string;
  reconnectTimeInSeconds: number;
  heartbeatIntervalInSeconds: number;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @Inject('RABBITMQ_CONFIG') private readonly config: RabbitMQConfig,
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
      this.connection = await amqp.connect(this.config.url, {
        heartbeat: this.config.heartbeatIntervalInSeconds,
      });

      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err.message);
        this.scheduleReconnect();
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, reconnecting...');
        this.scheduleReconnect();
      });

      this.channel = await this.connection.createConfirmChannel();

      this.channel.on('error', (err) => {
        this.logger.error('RabbitMQ channel error', err.message);
        this.scheduleReconnect();
      });

      this.channel.on('close', () => {
        this.logger.warn('RabbitMQ channel closed, reconnecting...');
        this.scheduleReconnect();
      });

      await this.setupTopology();

      this.isConnecting = false;
      this.logger.log('Successfully connected to RabbitMQ');
    } catch (error) {
      this.isConnecting = false;
      this.logger.error('Failed to connect to RabbitMQ', error.message);
      this.scheduleReconnect();
    }
  }

  private async setupTopology(): Promise<void> {
    if (!this.channel) return;

    // Dead letter exchange
    await this.channel.assertExchange(Exchange.DLX, 'direct', {
      durable: true,
    });

    // Dead letter queue
    await this.channel.assertQueue(Queue.NOTIFICATIONS_DLQ, {
      durable: true,
      arguments: {
        'x-queue-type': 'classic',
      },
    });

    await this.channel.bindQueue(
      Queue.NOTIFICATIONS_DLQ,
      Exchange.DLX,
      RoutingKey.DLQ,
    );

    // Main exchange
    await this.channel.assertExchange(Exchange.NOTIFICATIONS, 'direct', {
      durable: true,
    });

    // Main queue with DLX config
    await this.channel.assertQueue(Queue.NOTIFICATIONS, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': Exchange.DLX,
        'x-dead-letter-routing-key': RoutingKey.DLQ,
        'x-message-ttl': 86400000, // 24h TTL
        'x-queue-type': 'classic',
      },
    });

    await this.channel.bindQueue(
      Queue.NOTIFICATIONS,
      Exchange.NOTIFICATIONS,
      RoutingKey.NOTIFICATION,
    );
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

  async publishNotification(event: NotificationEvent): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available');
    }

    const message = Buffer.from(JSON.stringify(event));

    return new Promise((resolve, reject) => {
      this.channel.publish(
        Exchange.NOTIFICATIONS,
        RoutingKey.NOTIFICATION,
        message,
        {
          persistent: true,
          contentType: 'application/json',
          messageId: event.id,
          timestamp: Date.now(),
          headers: {
            'x-retry-count': 0,
          },
        },
        (err) => {
          if (err) {
            this.logger.error(
              `Failed to publish message ${event.id}`,
              err.message,
            );
            reject(err);
          } else {
            this.logger.log(`Message ${event.id} published successfully`);
            resolve();
          }
        },
      );
    });
  }

  get isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}
