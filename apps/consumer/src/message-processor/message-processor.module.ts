import { Module } from '@nestjs/common';
import { MessageProcessorService } from './message-processor.service';
import { TelegramClientModule } from '../telegram-client/telegram-client.module';

@Module({
  imports: [TelegramClientModule],
  providers: [MessageProcessorService],
  exports: [MessageProcessorService],
})
export class MessageProcessorModule {}
