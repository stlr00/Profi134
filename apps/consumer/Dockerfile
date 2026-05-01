FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY nest-cli.json ./

RUN npm ci

COPY libs/ ./libs/
COPY apps/consumer/ ./apps/consumer/

RUN npm run build:consumer

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3002

CMD ["node", "dist/apps/consumer/main"]
