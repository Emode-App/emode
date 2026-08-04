# Shopify embedded admin app (Remix). Deployed separately from apps/web —
# emode.style is the Next.js app; this container serves only the screen that
# renders inside Shopify admin, plus the webhook endpoints.

# Debian slim rather than alpine: Prisma's query engine needs glibc/OpenSSL, and
# the musl builds are a recurring source of "Unable to require libquery_engine"
# at runtime. Node 20 because package.json engines requires >=20.19 and Vite 6
# will not run on 18 (the previous base image).
FROM node:20-slim AS build

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json* ./

# Full install, including devDependencies: `remix vite:build` needs vite, which
# is a devDependency. Installing with --omit=dev before building (as the stock
# template does) fails here.
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Drop dev-only packages now that the build artifacts exist.
RUN npm prune --omit=dev && npm cache clean --force


FROM node:20-slim AS runtime

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

# `npm run docker-start` runs `prisma migrate deploy` before serving, so the
# Session table is created on first boot and kept current on later ones.
# Requires DIRECT_URL — migrations cannot run through the transaction pooler.
CMD ["npm", "run", "docker-start"]
