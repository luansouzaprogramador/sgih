# Rotas de Relatório

Este arquivo (`reportRoutes.js`) define os endpoints da API para gerar vários relatórios dentro do sistema, com foco nos níveis de estoque.

## Caminho Base

Todas as rotas definidas neste arquivo são tipicamente prefixadas com `/api/relatorios` (assumindo que estão montadas sob este caminho na aplicação principal).

## Autenticação e Autorização

* Todas as rotas exigem autenticação via middleware `authenticateToken`.
* O acesso aos relatórios é restrito às funções `almoxarife_central` ou `almoxarife_local` usando o middleware `authorizeRoles`.

## Endpoints

### 1. Obter Relatório de Estoque Crítico

Recupera um relatório de todos os lotes de suprimentos médicos que estão atualmente em níveis de estoque críticos (quantidade inferior a 20) e estão ativos.

* **URL:** `GET /estoque_critico`
* **Autenticação:** Obrigatória
* **Autorização:** `almoxarife_central` ou `almoxarife_local`
* **Descrição:** Este endpoint consulta o banco de dados para encontrar todos os lotes ativos (`status = 'ativo'`) onde a `quantidade_atual` (quantidade atual) está abaixo de um limite crítico predefinido (inferior a 20). Ele faz junções com as tabelas `insumos` e `unidades_hospitalares` para fornecer o nome do suprimento e o nome da unidade para cada lote crítico.
* **Resposta:**
    * `200 OK`: Um array de objetos, cada um representando um item de estoque crítico, incluindo `lote_id`, `insumo_nome`, `quantidade_atual` e `unidade_nome`.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

## Dependências

* `express`: Framework web.
* `../database`: Pool de conexão com o banco de dados.
* `../middleware/auth`: Middleware de autenticação e autorização.