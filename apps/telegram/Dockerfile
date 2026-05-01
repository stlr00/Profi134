FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY nest-cli.json ./

RUN npm ci

COPY libs/ ./libs/
COPY apps/telegram/ ./apps/telegram/

RUN npm run build:telegram

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3003

CMD ["node", "dist/apps/telegram/main"]
