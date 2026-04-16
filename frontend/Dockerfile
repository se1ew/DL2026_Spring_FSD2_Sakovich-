# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json

RUN npm install --workspace=frontend --legacy-peer-deps --no-audit --no-fund

COPY frontend/ ./frontend/
RUN npm run build --workspace=frontend

# Stage 2: serve with nginx
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
