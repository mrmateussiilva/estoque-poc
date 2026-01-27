# Estoque PoC

Prova de Conceito (PoC) de um sistema de controle de estoque automático baseado no processamento de arquivos XML de Nota Fiscal Eletrônica (NFe).

## Tecnologias

*   **Linguagem:** Go (Golang)
*   **Banco de Dados:** SQLite (Embarcado, sem necessidade de instalação externa)
*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla)

## Funcionalidades

*   **Upload de NFe:** Processamento de arquivos XML para cadastro automático de produtos e atualização de estoque.
*   **Listagem de Estoque:** Visualização simples dos produtos e quantidades armazenadas.
*   **Interface Web:** Frontend integrado para facilitar o uso.

## Como Executar

### Pré-requisitos
*   Go 1.20+ instalado.

### Passos

1.  Clone o repositório.
2.  Compile o projeto:
    ```bash
    go build -o estoque-poc
    ```
3.  Execute a aplicação:
    ```bash
    ./estoque-poc
    ```
4.  Acesse no navegador:
    *   [http://localhost:8080](http://localhost:8080)

## API Endpoints

*   `POST /nfe/upload`: Recebe um arquivo XML (multipart/form-data) na chave `file`.
*   `GET /stock`: Retorna JSON com a lista de produtos.

## Estrutura do Projeto

*   `main.go`: Lógica principal do servidor e regras de negócio.
*   `static/`: Arquivos do frontend (HTML/CSS/JS).
*   `estoque.db`: Banco de dados SQLite (criado automaticamente).