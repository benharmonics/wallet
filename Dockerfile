# Build
FROM node:alpine AS build
WORKDIR /app

COPY package*.json .
RUN npm ci

COPY . .
RUN npm run build

# Production
FROM node:alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json .
RUN npm ci --only=production

COPY --from=build /app/dist ./dist
EXPOSE 8989
CMD ["node", "--enable-source-maps", "./dist/index.js"]
