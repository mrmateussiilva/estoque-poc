# S.G.E. Backend - Docker

## Executar com Docker Compose

```bash
docker-compose up -d
```

O backend estará disponível em `http://localhost:8003`

## Parar o container

```bash
docker-compose down
```

## Ver logs

```bash
docker-compose logs -f backend
```

## Rebuild

```bash
docker-compose up -d --build
```

## Configuração

- Porta: 8003 (configurável via variável PORT)
- Banco de dados: SQLite montado como volume em `./estoque.db`
- Usuário padrão: admin@sge.com / admin123
