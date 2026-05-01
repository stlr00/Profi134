import { NestFactory } from '@nestjs/core';
import { ConsumerModule } from './consumer.module';

async function bootstrap() {
  const app = await NestFactory.create(ConsumerModule);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Consumer service is running on port ${port}`);
}

bootstrap();
