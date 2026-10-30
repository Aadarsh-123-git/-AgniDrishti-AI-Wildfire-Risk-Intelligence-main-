# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production Server
# ==========================================
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend
COPY --from=builder /app/dist ./dist

# Copy backend server files
COPY server.ts ./
COPY server ./server
COPY src/types.ts ./src/types.ts
COPY src/i18n ./src/i18n

EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
