import { NotificationEvent } from './notification-event.interface';

export interface IMessageProducer {
  publish(event: NotificationEvent): Promise<void>;
}

export interface IMessageConsumer {
  handleMessage(event: NotificationEvent): Promise<void>;
}
