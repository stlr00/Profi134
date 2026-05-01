export enum Queue {
  NOTIFICATIONS = 'notifications',
  NOTIFICATIONS_DLQ = 'notifications.dlq',
}

export enum Exchange {
  NOTIFICATIONS = 'notifications.exchange',
  DLX = 'notifications.dlx',
}

export enum RoutingKey {
  NOTIFICATION = 'notification',
  DLQ = 'dlq',
}
