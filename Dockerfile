# ═══════════════════════════════════════════════════════════════
# Sanka Bot Deployer - Docker Configuration
# Optimized for Railway Deployment
# ═══════════════════════════════════════════════════════════════

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for building native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Copy package files and local patches
COPY package*.json ./
COPY patches ./patches

# Install dependencies (not production to ensure all deps are installed)
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Create necessary directories
RUN mkdir -p sessions logs

# Set environment
ENV NODE_ENV=production
# ENV PORT=3000 (Removed to allow dynamic injection)

# Expose port (Optional, Railway ignores this usually but good for local)
EXPOSE 3000

# Health check removed (Use Railway's default TCP check)

# Start the bot
CMD ["npm", "start"]
