FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=https://gen-api-2af9.onrender.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules node_modules
COPY package.json package-lock.json ./
COPY apps/web apps/web
COPY packages packages
COPY tsconfig.json tsconfig.json
RUN npm run build -w @gen/web

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/apps/web apps/web
COPY --from=build /app/package.json package.json
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
