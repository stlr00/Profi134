import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  port: parseInt(process.env.PORT, 10) || 3003,
  bot: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    apiUrl: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`,
  },
}));
