# Estoque PoC

Prova de Conceito (PoC) de um sistema de controle de estoque automático baseado no processamento de arquivos XML de Nota Fiscal Eletrônica (NFe).

## Tecnologias

*   **Linguagem:** Go (Golang)
*   **Banco de Dados:** MySQL 5.6
*   **Frontend:** React + TypeScript (Vite)

## Funcionalidades

*   **Upload de NFe:** Processamento de arquivos XML para cadastro automático de produtos e atualização de estoque.
*   **Gestão de Estoque:** Controle de entradas e saídas com rastreabilidade total.
*   **Dashboard:** Visualização de estatísticas e evolução do estoque.
*   **Interface Web:** Interface moderna construída com React e Tailwind CSS.

## Como Executar

### Pré-requisitos
*   Go 1.25+ instalado.
*   Node.js e pnpm (para o frontend).
*   MySQL 5.6 em execução.

### Configuração
Crie um arquivo `.env` na raiz ou defina as variáveis de ambiente:
```bash
DB_USER=seu_usuario
DB_PASS=sua_senha
DB_HOST=localhost
DB_PORT=3306
DB_NAME=estoque
PORT=8003
```

### Passos

1.  Compile o backend:
    ```bash
    go build -o estoque-poc main.go
    ```
2.  Build do frontend:
    ```bash
    cd frontend
    pnpm install
    pnpm build
    cp -r dist/* ../static/
    cd ..
    ```
3.  Execute a aplicação:
    ```bash
    ./estoque-poc
    ```
4.  Acesse no navegador:
    *   [http://localhost:8003](http://localhost:8003)

## Documentação Detalhada

Para informações técnicas completas, consulte:
- [.agent/agents.md](.agent/agents.md) - Guia para desenvolvedores e agentes de IA.
- [.agent/rules.md](.agent/rules.md) - Regras e convenções do projeto.

## Estrutura do Projeto

*   `main.go`: Ponto de entrada do servidor.
*   `internal/`: Lógica de negócio, API e banco de dados.
*   `frontend/`: Código fonte da interface React.
*   `static/`: Arquivos do frontend compilados (servidos pelo Go).