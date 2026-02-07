# Estágio 1: Build do Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
# Copiar arquivos de dependências
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
# Instalar pnpm (se estiver usando) ou usar npm
RUN npm install -g pnpm && pnpm install

# Copiar código do frontend e buildar
COPY frontend/ .
RUN pnpm run build

# Estágio 2: Build do Backend Go
FROM golang:1.23-alpine AS backend-builder

WORKDIR /app
# Copiar arquivos de dependências do Go
COPY go.mod go.sum ./
RUN go mod download

# Copiar código do backend
COPY . .

# Copiar o build do frontend para a pasta static que o Go servirá
# O Vite por padrão gera em frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./static

# Compilar o backend
RUN CGO_ENABLED=0 GOOS=linux go build -o estoque-poc main.go

# Estágio 3: Imagem Final Leve
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copiar o binário e os arquivos estáticos
COPY --from=backend-builder /app/estoque-poc .
COPY --from=backend-builder /app/static ./static

EXPOSE 8003

CMD ["./estoque-poc"]
