FROM golang:1.23-alpine AS builder

WORKDIR /app

# Instalar dependências necessárias
RUN apk add --no-cache ca-certificates tzdata

# Copiar arquivos de dependências do Go
COPY go.mod go.sum ./
RUN go mod download

# Copiar código do backend
COPY . .

# Compilar o backend
# CGO_ENABLED=0 para garantir portabilidade entre distribuições Linux
RUN CGO_ENABLED=0 GOOS=linux go build -o estoque-poc main.go

# Imagem Final Leve
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copiar apenas o binário compilado
COPY --from=builder /app/estoque-poc .
RUN mkdir -p static

# Nota: O frontend está na Vercel, o backend servirá apenas como API

EXPOSE 8003

CMD ["./estoque-poc"]
