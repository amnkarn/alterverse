FROM oven/bun:1 AS base

WORKDIR /app

# Copy all package and lockfiles
COPY package.json bun.lock ./
COPY turbo.json ./
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/web/package.json ./apps/web/

RUN bun install

COPY . .

# because vite need env file on build time
# Accept secret from GitHub
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ARG VITE_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL

# build the backend(root script)
RUN bun run build:web

EXPOSE 5173

# root script, start app/web
CMD [ "bun", "run", "start:web" ]