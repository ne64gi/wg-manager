FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend ./

CMD ["npx", "playwright", "test"]
