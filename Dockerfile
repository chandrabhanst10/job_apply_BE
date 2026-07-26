FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/server.js"]
