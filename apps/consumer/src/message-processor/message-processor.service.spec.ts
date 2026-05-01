import { Test, TestingModule } from '@nestjs/testing';
import { MessageProcessorService } from './message-processor.service';
import { TelegramClientService } from '../telegram-client/telegram-client.service';
import { NotificationEvent } from '@app/shared';

const mockTelegramClient = {
  sendNotification: jest.fn(),
};

describe('MessageProcessorService', () => {
  let service: MessageProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageProcessorService,
        { provide: TelegramClientService, useValue: mockTelegramClient },
      ],
    }).compile();

    service = module.get<MessageProcessorService>(MessageProcessorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process event and forward to telegram service', async () => {
    mockTelegramClient.sendNotification.mockResolvedValue(undefined);

    const event: NotificationEvent = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      message: 'Test message',
      title: 'Test',
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    await service.process(event);

    expect(mockTelegramClient.sendNotification).toHaveBeenCalledWith(event);
  });

  it('should rethrow error from telegram client', async () => {
    mockTelegramClient.sendNotification.mockRejectedValue(
      new Error('Telegram service unavailable: timeout'),
    );

    const event: NotificationEvent = {
      id: 'test-id',
      message: 'Test',
      createdAt: new Date().toISOString(),
    };

    await expect(service.process(event)).rejects.toThrow(
      'Telegram service unavailable: timeout',
    );
  });
});
