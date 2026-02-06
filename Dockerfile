FROM golang:1.24-alpine AS builder

WORKDIR /app

# Não precisamos mais de gcc/musl/sqlite-dev para o MySQL
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Desativar CGO_ENABLED pois o driver MySQL é pure Go
RUN CGO_ENABLED=0 GOOS=linux go build -o estoque-poc main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/estoque-poc .
# Copiar arquivos estáticos do frontend (pasta static)
COPY --from=builder /app/static ./static

EXPOSE 8003

CMD ["./estoque-poc"]
