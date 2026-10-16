FROM oven/bun:1 AS base

WORKDIR /app

# Copy all package and lockfiles
COPY package.json bun.lock ./
COPY turbo.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/backend/package.json ./apps/backend/

RUN bun install

COPY . .

# generate db client
RUN bun db:generate

EXPOSE 8080

# root script, start app/backend
CMD [ "bun", "run", "start:backend" ]