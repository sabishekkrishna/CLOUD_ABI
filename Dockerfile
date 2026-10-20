# Multi-stage Dockerfile optimized for serverless container clouds
# (Google Cloud Run, Railway, Render, Fly.io, AWS App Runner)

# Stage 1: Build Frontend and Server
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* bun.lock* ./

# Install all dependencies (including devDependencies needed for Vite build)
RUN npm install

# Copy source files
COPY . .

# Build the client app and bundle the server
RUN npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production-only dependencies
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled frontend and application files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types.ts ./src/types.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create non-root user and persistent data folder
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

# Run the full-stack server
CMD ["npm", "start"]
