FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
# Postgres connection (schema/user provisioned on your existing instance).
# ENV DATABASE_URL is provided at runtime (see docker-compose.yml).
# DATA_DIR still backs uploaded documents on disk.
ENV DATA_DIR=/data

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle

VOLUME /data
EXPOSE 3000
# Migrations + first-run seed run automatically on boot via Next instrumentation.
CMD ["node", "server.js"]
