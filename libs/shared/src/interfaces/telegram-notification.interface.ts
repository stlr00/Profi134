export interface ITelegramNotificationService {
  sendNotification(event: {
    id: string;
    message: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
