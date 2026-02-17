# Estágio de Compilação
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Instalar dependências básicas do builder
RUN apk add --no-cache ca-certificates tzdata

# Cache de dependências (go mod)
# Usando cache mount para acelerar o download em builds sucessivos
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copiar código-fonte
COPY . .

# Compilação otimizada
# -ldflags="-s -w" remove tabelas de símbolos e debug, reduzindo ~20-30% do binário
# --mount=type=cache permite reutilizar o cache de compilação do Go
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o estoque-poc main.go

# Imagem Final (Runtime)
FROM alpine:3.21

# Segurança: ca-certificates para HTTPS e tzdata para horários locais
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copiar apenas o binário essencial
COPY --from=builder /app/estoque-poc .

# Garantir estrutura mínima
RUN mkdir -p static exports

# Porta padrão do serviço
EXPOSE 8003

# Execução
CMD ["./estoque-poc"]
