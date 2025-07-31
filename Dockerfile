# Production Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S maiello -u 1001

# Copy built application
COPY --from=builder --chown=maiello:nodejs /app/dist ./dist
COPY --from=builder --chown=maiello:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=maiello:nodejs /app/package*.json ./

# Create uploads directory
RUN mkdir -p uploads && chown maiello:nodejs uploads

USER maiello

EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]