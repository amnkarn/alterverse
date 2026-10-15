FROM oven/bun:1 AS base

WORKDIR /app

# Copy all package and lockfiles
COPY package.json bun.lock ./
COPY turbo.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/ws/package.json ./apps/ws/

RUN bun install

COPY . .

# generate db client
RUN bun db:generate

EXPOSE 3001

# root script, start app/ws
CMD [ "bun", "run", "start:ws" ]