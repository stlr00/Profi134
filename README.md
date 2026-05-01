# Profi134 — NestJS Microservices with RabbitMQ & Telegram

Микросервисная архитектура на NestJS с брокером сообщений RabbitMQ и отправкой уведомлений через Telegram Bot API.

## Архитектура

```
┌─────────────┐    HTTP POST     ┌──────────────────┐
│   Client    │ ──────────────►  │ Producer Service │
└─────────────┘                  │    (port 3001)   │
                                 └────────┬─────────┘
                                          │ publish
                                          ▼
                                  ┌──────────────┐
                                  │   RabbitMQ   │
                                  │ notifications│
                                  │    queue     │
                                  └──────┬───────┘
                                         │ consume
                                         ▼
                                 ┌────────────────────┐
                                 │  Consumer Service  │
                                 │    (port 3002)     │
                                 │  retry: 3 attempts │
                                 │  exp. backoff      │
                                 └────────┬───────────┘
                                          │ HTTP POST /telegram/notify
                                          ▼
                                 ┌────────────────────┐
                                 │  Telegram Service  │
                                 │    (port 3003)     │
                                 └────────┬───────────┘
                                          │ sendMessage
                                          ▼
                                  ┌──────────────┐
                                  │ Telegram Bot │
                                  │     API      │
                                  └──────────────┘
```

### Сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| **Producer** | 3001 | REST API, публикует события в RabbitMQ с UUID для идемпотентности |
| **Consumer** | 3002 | Читает из RabbitMQ, подтверждает обработку, ретраи с exponential backoff |
| **Telegram** | 3003 | Отправляет уведомления через Telegram Bot API |
| **RabbitMQ** | 5672 / 15672 | Брокер сообщений (management UI на 15672) |

### Ключевые решения

- **Идемпотентность**: каждое событие имеет UUID (`messageId` в свойствах AMQP-сообщения)
- **Confirm Channel**: Producer использует `ConfirmChannel` — `publish()` возвращает `Promise` с подтверждением broker-а
- **Manual ACK**: Consumer вручную подтверждает (`ack`) только после успешной обработки
- **Retry с exponential backoff**: 3 попытки с задержкой `delay * 2^n`
- **Dead Letter Queue**: после исчерпания попыток сообщение уходит в `notifications.dlq`
- **Reconnect**: оба сервиса автоматически переподключаются при потере связи

## Быстрый старт

### Требования

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2
- Telegram Bot Token (см. ниже)

### 1. Создать Telegram бота

1. Написать [@BotFather](https://t.me/BotFather) → `/newbot`
2. Сохранить полученный **токен**
3. Написать боту любое сообщение
4. Получить `chat_id` — через [@userinfobot](https://t.me/userinfobot) или API:
   ```
   curl https://api.telegram.org/bot<TOKEN>/getUpdates
   ```

### 2. Настроить окружение

```bash
cp .env.example .env
```

Заполнить `.env`:

```env
RABBITMQ_USER=guest
RABBITMQ_PASS=guest
TELEGRAM_BOT_TOKEN=1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=123456789
```

### 3. Запустить все сервисы

```bash
docker compose up --build
```

Дождаться, пока все сервисы поднимутся (RabbitMQ стартует ~20-30 сек).

### 4. Отправить уведомление

```bash
curl -X POST http://localhost:3001/notifications \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Привет из микросервиса!",
    "title": "Тестовое уведомление",
    "metadata": { "env": "dev", "version": "1.0" }
  }'
```

Ответ:
```json
{ "id": "550e8400-e29b-41d4-a716-446655440000", "status": "published" }
```

Через несколько секунд в Telegram придёт сообщение:

```
Test Notification

Привет из микросервиса!

Metadata:
  • env: dev
  • version: 1.0

Event ID: 550e8400-e29b-41d4-a716-446655440000
```

## Swagger API Docs

После запуска:

- Producer: http://localhost:3001/api/docs
- Telegram: http://localhost:3003/api/docs

## RabbitMQ Management UI

http://localhost:15672 — логин/пароль из `.env` (по умолчанию `guest`/`guest`)

## Запуск тестов

```bash
# Установить зависимости
npm install

# Unit-тесты
npm test

# Unit-тесты с покрытием
npm run test:cov

# e2e-тесты
npm run test:e2e
```

## Разработка (без Docker)

Запустить только RabbitMQ:

```bash
docker compose up rabbitmq -d
```

Затем запустить сервисы локально в разных терминалах:

```bash
# Terminal 1 — Telegram service (нужен первым, т.к. Consumer к нему обращается)
TELEGRAM_BOT_TOKEN=<token> TELEGRAM_CHAT_ID=<id> npm run start:telegram:dev

# Terminal 2 — Consumer
RABBITMQ_URL=amqp://guest:guest@localhost:5672 \
TELEGRAM_SERVICE_URL=http://localhost:3003 \
npm run start:consumer:dev

# Terminal 3 — Producer
RABBITMQ_URL=amqp://guest:guest@localhost:5672 \
npm run start:producer:dev
```

## Структура проекта

```
profi134/
├── apps/
│   ├── producer/            # Сервис публикации событий
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── notifications/   # HTTP контроллер + сервис
│   │   │   ├── rabbitmq/        # AMQP ConfirmChannel
│   │   │   └── main.ts
│   │   ├── test/            # e2e тесты
│   │   └── Dockerfile
│   ├── consumer/            # Сервис обработки сообщений
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── message-processor/   # Бизнес-логика обработки
│   │   │   ├── rabbitmq/            # AMQP consumer + retry
│   │   │   └── telegram-client/     # HTTP клиент к telegram сервису
│   │   └── Dockerfile
│   └── telegram/            # Сервис Telegram уведомлений
│       ├── src/
│       │   ├── config/
│       │   └── telegram/        # Bot client + форматирование
│       └── Dockerfile
├── libs/
│   └── shared/              # Общие DTO, интерфейсы, enum-ы
│       └── src/
│           ├── dto/
│           ├── enums/
│           └── interfaces/
├── docker-compose.yml
├── nest-cli.json
├── tsconfig.json
└── .env.example
```
