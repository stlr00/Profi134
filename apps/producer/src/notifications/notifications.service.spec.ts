import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { SendNotificationDto } from '@app/shared';

const mockRabbitMQService = {
  publishNotification: jest.fn(),
  isConnected: true,
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: RabbitMQService, useValue: mockRabbitMQService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should publish notification and return id and status', async () => {
    mockRabbitMQService.publishNotification.mockResolvedValue(undefined);

    const dto: SendNotificationDto = {
      message: 'Test notification',
      title: 'Test Title',
      metadata: { key: 'value' },
    };

    const result = await service.sendNotification(dto);

    expect(result).toMatchObject({ status: 'published' });
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(mockRabbitMQService.publishNotification).toHaveBeenCalledTimes(1);

    const publishedEvent = mockRabbitMQService.publishNotification.mock.calls[0][0];
    expect(publishedEvent.message).toBe(dto.message);
    expect(publishedEvent.title).toBe(dto.title);
    expect(publishedEvent.metadata).toEqual(dto.metadata);
    expect(publishedEvent.retryCount).toBe(0);
    expect(publishedEvent.createdAt).toBeDefined();
  });

  it('should throw if RabbitMQ publish fails', async () => {
    mockRabbitMQService.publishNotification.mockRejectedValue(
      new Error('Connection refused'),
    );

    const dto: SendNotificationDto = { message: 'Test' };

    await expect(service.sendNotification(dto)).rejects.toThrow('Connection refused');
  });
});
