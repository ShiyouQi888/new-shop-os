FROM node:22-slim AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
RUN pnpm install --frozen-lockfile

COPY apps/server apps/server
RUN pnpm --filter @shop-os/server build

FROM node:22-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY apps/server/package.json package.json
RUN npm install --omit=dev

COPY --from=build /app/apps/server/dist ./dist
COPY apps/server/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /data /uploads && chmod +x ./docker-entrypoint.sh

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
