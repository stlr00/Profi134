export interface NotificationEvent {
  id: string;
  message: string;
  title?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  retryCount?: number;
}
