# Rotas de Alerta

Este arquivo (`alertRoutes.js`) define os endpoints da API para recuperar e gerenciar alertas dentro do sistema. Esses alertas geralmente se relacionam com níveis de estoque ou outras informações críticas que exigem atenção.

## Caminho Base

Todas as rotas definidas neste arquivo são tipicamente prefixadas com `/api/alertas` (assumindo que estão montadas sob este caminho na aplicação principal).

## Autenticação

* Todas as rotas exigem autenticação via middleware `authenticateToken`.
* A lógica de autorização é tratada dentro de cada rota com base no `req.user.tipo_usuario` (tipo de usuário).

## Endpoints

### 1. Obter Todos os Alertas Ativos (Somente Almoxarife Central)

Recupera uma lista de todos os alertas ativos em todas as unidades.

* **URL:** `GET /`
* **Autenticação:** Obrigatória
* **Autorização:** Somente `almoxarife_central`
* **Descrição:** Este endpoint busca todos os alertas ativos da tabela `alertas`, enriquecendo os dados com `insumo_nome` (nome do suprimento) e `numero_lote` (número do lote), quando aplicável. É restrito a almoxarifes centrais.
* **Resposta:**
    * `200 OK`: Um array de objetos de alerta ativos.
    * `403 Forbidden`: Se o usuário autenticado não for um `almoxarife_central`.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

### 2. Obter Alertas de Estoque Crítico para uma Unidade Específica ou Todas as Unidades

Recupera alertas de estoque crítico, opcionalmente filtrados por uma unidade hospitalar específica.

* **URL:** `GET /estoque_critico/:unidadeId`
* **Autenticação:** Obrigatória
* **Autorização:**
    * `almoxarife_local`: Pode ver alertas de estoque crítico apenas para sua *própria* `unidadeId`.
    * `almoxarife_central`: Pode ver alertas de estoque crítico para *qualquer* `unidadeId` ou para *todas* as unidades (`'all'`).
* **Parâmetros:**
    * `unidadeId` (Parâmetro de Caminho): O ID da unidade hospitalar, ou a string `'all'` para recuperar alertas de todas as unidades (acessível apenas por `almoxarife_central`).
* **Descrição:** Este endpoint busca alertas ativos do tipo `estoque_critico` (estoque crítico). Inclui detalhes como `unidade_nome`, `insumo_nome`, `quantidade_atual` (quantidade atual), `lote_id` e a `mensagem` do alerta.
* **Resposta:**
    * `200 OK`: Um array de objetos de alerta de estoque crítico.
    * `403 Forbidden`: Se um `almoxarife_local` tentar acessar alertas de estoque crítico fora de sua unidade ou tentar visualizar para `'all'` unidades.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

### 3. Obter Todos os Alertas Ativos para uma Unidade Específica

Recupera todos os alertas ativos associados a uma unidade hospitalar específica.

* **URL:** `GET /:unidadeId`
* **Autenticação:** Obrigatória
* **Autorização:**
    * `almoxarife_local`: Pode ver alertas apenas para sua *própria* `unidadeId`.
    * `almoxarife_central`: Pode ver alertas para *qualquer* `unidadeId`.
* **Parâmetros:**
    * `unidadeId` (Parâmetro de Caminho): O ID da unidade hospitalar.
* **Descrição:** Este endpoint busca todos os alertas ativos onde o `unidade_id` corresponde ao parâmetro fornecido. Ele faz junções com as tabelas `insumos` e `lotes` para fornecer mais contexto.
* **Resposta:**
    * `200 OK`: Um array de objetos de alerta ativos para a unidade especificada.
    * `403 Forbidden`: Se um `almoxarife_local` tentar acessar alertas fora de sua unidade.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

## Dependências

* `express`: Framework web.
* `../database`: Pool de conexão com o banco de dados.
* `../middleware/auth`: Middleware de autenticação.