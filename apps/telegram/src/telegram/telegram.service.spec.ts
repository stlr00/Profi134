import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';
import { TelegramBotClient } from './telegram-bot.client';
import { NotifyDto } from './dto/notify.dto';

const mockBotClient = {
  sendMessage: jest.fn(),
};

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        { provide: TelegramBotClient, useValue: mockBotClient },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send notification with title and message', async () => {
    mockBotClient.sendMessage.mockResolvedValue(undefined);

    const dto: NotifyDto = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      message: 'Hello World',
      title: 'Test Notification',
    };

    await service.sendNotification(dto);

    expect(mockBotClient.sendMessage).toHaveBeenCalledTimes(1);
    const [text] = mockBotClient.sendMessage.mock.calls[0];
    expect(text).toContain('<b>Test Notification</b>');
    expect(text).toContain('Hello World');
    expect(text).toContain(dto.id);
  });

  it('should send notification without title', async () => {
    mockBotClient.sendMessage.mockResolvedValue(undefined);

    const dto: NotifyDto = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      message: 'No title message',
    };

    await service.sendNotification(dto);

    const [text] = mockBotClient.sendMessage.mock.calls[0];
    expect(text).not.toContain('<b>');
    expect(text).toContain('No title message');
  });

  it('should include metadata in message', async () => {
    mockBotClient.sendMessage.mockResolvedValue(undefined);

    const dto: NotifyDto = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      message: 'Message with meta',
      metadata: { env: 'production', version: '1.0' },
    };

    await service.sendNotification(dto);

    const [text] = mockBotClient.sendMessage.mock.calls[0];
    expect(text).toContain('env');
    expect(text).toContain('production');
    expect(text).toContain('version');
  });

  it('should escape HTML special characters', async () => {
    mockBotClient.sendMessage.mockResolvedValue(undefined);

    const dto: NotifyDto = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      message: 'Alert: <script>alert("xss")</script> & more',
    };

    await service.sendNotification(dto);

    const [text] = mockBotClient.sendMessage.mock.calls[0];
    expect(text).not.toContain('<script>');
    expect(text).toContain('&lt;script&gt;');
    expect(text).toContain('&amp;');
  });

  it('should propagate error from bot client', async () => {
    mockBotClient.sendMessage.mockRejectedValue(
      new Error('Telegram API returned 400: chat not found'),
    );

    const dto: NotifyDto = {
      id: '550e8400-e29b-41d4-a716-446655440004',
      message: 'Test',
    };

    await expect(service.sendNotification(dto)).rejects.toThrow(
      'Telegram API returned 400: chat not found',
    );
  });
});
