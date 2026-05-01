import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { SendNotificationDto } from '@app/shared';

const mockNotificationsService = {
  sendNotification: jest.fn(),
};

const mockRabbitMQService = {
  isConnected: true,
};

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: RabbitMQService, useValue: mockRabbitMQService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /notifications', () => {
    it('should return published event id and status', async () => {
      const expectedResult = { id: 'some-uuid', status: 'published' };
      mockNotificationsService.sendNotification.mockResolvedValue(expectedResult);

      const dto: SendNotificationDto = { message: 'Hello' };
      const result = await controller.publish(dto);

      expect(result).toEqual(expectedResult);
      expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /notifications/health', () => {
    it('should return health status with rabbitmq connected', () => {
      const result = controller.health();
      expect(result.status).toBe('ok');
      expect(result.rabbitmq).toBe('connected');
      expect(result.timestamp).toBeDefined();
    });

    it('should return disconnected when RabbitMQ is down', () => {
      mockRabbitMQService.isConnected = false;
      const result = controller.health();
      expect(result.rabbitmq).toBe('disconnected');
    });
  });
});
