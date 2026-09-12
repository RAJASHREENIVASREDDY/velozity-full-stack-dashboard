FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update -y \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000

CMD ["node", "dist/src/server.js"]