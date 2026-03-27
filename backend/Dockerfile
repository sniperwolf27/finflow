FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS development
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
