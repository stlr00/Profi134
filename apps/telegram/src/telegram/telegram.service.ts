import { Injectable, Logger } from '@nestjs/common';
import { TelegramBotClient } from './telegram-bot.client';
import { NotifyDto } from './dto/notify.dto';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly botClient: TelegramBotClient) {}

  async sendNotification(dto: NotifyDto): Promise<void> {
    const text = this.formatMessage(dto);

    this.logger.log(`Sending Telegram notification for event ${dto.id}`);

    await this.botClient.sendMessage(text);

    this.logger.log(`Telegram notification sent for event ${dto.id}`);
  }

  private formatMessage(dto: NotifyDto): string {
    const parts: string[] = [];

    if (dto.title) {
      parts.push(`<b>${this.escapeHtml(dto.title)}</b>`);
      parts.push('');
    }

    parts.push(this.escapeHtml(dto.message));

    if (dto.metadata && Object.keys(dto.metadata).length > 0) {
      parts.push('');
      parts.push('<i>Metadata:</i>');
      for (const [key, value] of Object.entries(dto.metadata)) {
        parts.push(
          `  • <code>${this.escapeHtml(key)}</code>: ${this.escapeHtml(String(value))}`,
        );
      }
    }

    parts.push('');
    parts.push(`<code>Event ID: ${dto.id}</code>`);

    return parts.join('\n');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
