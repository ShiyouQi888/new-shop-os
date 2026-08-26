FROM node:22-slim AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/shop/package.json apps/shop/package.json
RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/shop apps/shop

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm --filter @shop-os/shop build

FROM nginx:1.27-alpine AS runtime

COPY apps/shop/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/shop/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
