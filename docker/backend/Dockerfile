FROM oven/bun:1 AS base

WORKDIR /app

COPY package.json bun.lock ./
COPY turbo.json ./

COPY packages/db/package.json ./packages/db/
COPY packages/typescript-config/package.json ./packages/typescript-config/

COPY apps/backend/package.json ./apps/backend/

RUN bun install

COPY . .

# generate db client
RUN bun db:generate

# build the backend(root script)
RUN bun build:backend

EXPOSE 8080

# root script, start app/backend
CMD [ "bun", "run", "start:backend" ]