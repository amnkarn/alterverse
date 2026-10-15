FROM oven/bun:1 AS base

WORKDIR /app

# Copy all package and lockfiles
COPY package.json bun.lock ./
COPY turbo.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/web/package.json ./apps/web/

RUN bun install

COPY . .

# generate db client
RUN bun db:generate

# build the backend(root script)
RUN bun run build:web

EXPOSE 5173

# root script, start app/web
CMD [ "bun", "run", "start:web" ]