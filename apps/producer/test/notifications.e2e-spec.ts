import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ProducerModule } from '../src/producer.module';
import { RabbitMQService } from '../src/rabbitmq/rabbitmq.service';

const mockRabbitMQService = {
  publishNotification: jest.fn().mockResolvedValue(undefined),
  isConnected: true,
  onModuleInit: jest.fn(),
  onModuleDestroy: jest.fn(),
};

describe('NotificationsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProducerModule],
    })
      .overrideProvider(RabbitMQService)
      .useValue(mockRabbitMQService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRabbitMQService.publishNotification.mockResolvedValue(undefined);
  });

  describe('POST /notifications', () => {
    it('should publish notification and return 202', async () => {
      const response = await request(app.getHttpServer())
        .post('/notifications')
        .send({ message: 'Hello from e2e test', title: 'E2E Test' })
        .expect(202);

      expect(response.body.status).toBe('published');
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(mockRabbitMQService.publishNotification).toHaveBeenCalledTimes(1);
    });

    it('should reject request with missing message field', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .send({ title: 'No message' })
        .expect(400);
    });

    it('should reject request with unknown fields', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .send({ message: 'Test', unknownField: 'value' })
        .expect(400);
    });

    it('should return 500 when RabbitMQ publish fails', async () => {
      mockRabbitMQService.publishNotification.mockRejectedValue(
        new Error('Channel not available'),
      );

      await request(app.getHttpServer())
        .post('/notifications')
        .send({ message: 'Test' })
        .expect(500);
    });
  });

  describe('GET /notifications/health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.rabbitmq).toBe('connected');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
