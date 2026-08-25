FROM node:20-alpine AS base
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/config/package.json packages/config/package.json
RUN npm install
COPY . .
RUN npm run build --workspace=apps/api
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
