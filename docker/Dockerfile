# docker/Dockerfile
# ------------------ Builder ------------------
FROM node:18-alpine AS builder
WORKDIR /app

# Native build tools if any package needs them
RUN apk add --no-cache python3 make g++

# Copy manifests first for better cache
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL deps (incl. dev) to build TypeScript
RUN npm ci

# Copy source and build
COPY src/ ./src/
RUN npm run build


# ------------------ Production ------------------
FROM node:18-alpine AS production
WORKDIR /app

# Proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
 && adduser -S amda -u 1001

# Prevent husky (prepare) from running in container installs
ENV HUSKY=0
ENV NODE_ENV=production

# Copy manifests
COPY package*.json ./

# Install ONLY production deps (npm v10+ syntax)
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# App dirs & permissions
RUN mkdir -p logs uploads \
 && chown -R amda:nodejs /app

USER amda

EXPOSE 3000

# Health check (uses Node HTTP request; no curl/wget needed)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
