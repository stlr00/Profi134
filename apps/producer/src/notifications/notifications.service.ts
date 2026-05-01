import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { SendNotificationDto, NotificationEvent } from '@app/shared';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async sendNotification(dto: SendNotificationDto): Promise<{ id: string; status: string }> {
    const event: NotificationEvent = {
      id: uuidv4(),
      message: dto.message,
      title: dto.title,
      metadata: dto.metadata,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.logger.log(`Publishing notification event ${event.id}`);

    await this.rabbitMQService.publishNotification(event);

    this.logger.log(`Notification event ${event.id} published successfully`);

    return { id: event.id, status: 'published' };
  }
}
