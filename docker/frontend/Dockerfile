FROM node:22-alpine AS build

WORKDIR /frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
COPY VERSION ./VERSION
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine

COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /frontend/dist /usr/share/nginx/html/wg-studio
