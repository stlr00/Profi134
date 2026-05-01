import { Injectable, Logger, Inject } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

interface TelegramBotConfig {
  token: string;
  chatId: string;
  apiUrl: string;
}

interface SendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: { id: number };
    text: string;
    date: number;
  };
  description?: string;
}

@Injectable()
export class TelegramBotClient {
  private readonly logger = new Logger(TelegramBotClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(
    @Inject('TELEGRAM_BOT_CONFIG') private readonly config: TelegramBotConfig,
  ) {
    this.httpClient = axios.create({
      baseURL: config.apiUrl,
      timeout: 15000,
    });
  }

  async sendMessage(text: string, chatId?: string): Promise<void> {
    const targetChatId = chatId || this.config.chatId;

    if (!this.config.token) {
      throw new Error('Telegram bot token is not configured');
    }

    if (!targetChatId) {
      throw new Error('Telegram chat ID is not configured');
    }

    try {
      const response = await this.httpClient.post<SendMessageResponse>(
        '/sendMessage',
        {
          chat_id: targetChatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        },
      );

      if (!response.data.ok) {
        throw new Error(
          `Telegram API error: ${response.data.description || 'Unknown error'}`,
        );
      }

      this.logger.log(
        `Message sent to chat ${targetChatId}, message_id=${response.data.result?.message_id}`,
      );
    } catch (error) {
      if (error.response) {
        const { status, data } = error.response;
        throw new Error(
          `Telegram API returned ${status}: ${data?.description || JSON.stringify(data)}`,
        );
      }
      throw error;
    }
  }
}
