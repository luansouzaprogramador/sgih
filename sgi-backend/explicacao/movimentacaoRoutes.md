# Rotas de Movimentação

Este arquivo (`movimentacaoRoutes.js`) define os endpoints da API para recuperar "movimentações" (movimentos ou transações) de suprimentos médicos dentro do sistema. Essas movimentações rastreiam a entrada e saída de itens entre diferentes unidades hospitalares.

## Caminho Base

Todas as rotas definidas neste arquivo são tipicamente prefixadas com `/api/movimentacoes` (assumindo que estão montadas sob este caminho na aplicação principal).

## Autenticação e Autorização

* Todas as rotas exigem autenticação via middleware `authenticateToken`.
* O acesso aos logs de movimentação gerais (sem um `unidadeId` específico) é restrito ao `almoxarife_central`.
* Almoxarifes locais (`almoxarife_local`) só podem visualizar movimentações relacionadas à sua própria unidade.

## Dependências

* `express`: Framework web.
* `../database`: Pool de conexão com o banco de dados.
* `../middleware/auth`: Middleware de autenticação.

## Endpoints

### 1. Obter Todas as Movimentações (Somente Almoxarife Central)

Recupera uma lista abrangente de todas as movimentações de suprimentos médicos em todas as unidades.

* **URL:** `GET /`
* **Autenticação:** Obrigatória
* **Autorização:** Somente `almoxarife_central`
* **Parâmetros de Consulta (Opcional):**
    * `insumoId` (Número): Filtra as movimentações por um ID de suprimento médico específico.
    * `periodo` (Número): Filtra as movimentações por um período em dias (por exemplo, `7` para os últimos 7 dias).
* **Descrição:** Este endpoint busca todos os registros de movimentação, incluindo detalhes sobre o suprimento, número do lote, usuário responsável e os nomes das unidades de origem e destino. Permite filtrar por `insumoId` e `periodo`.
* **Resposta:**
    * `200 OK`: Um array de objetos de movimentação.
    * `403 Forbidden`: Se o usuário autenticado não for um `almoxarife_central`.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

### 2. Obter Movimentações para uma Unidade Específica

Recupera movimentações relacionadas a uma unidade hospitalar específica, onde a unidade é a origem ou o destino da movimentação.

* **URL:** `GET /:unidadeId`
* **Autenticação:** Obrigatória
* **Autorização:**
    * `almoxarife_local`: Só pode ver movimentações onde seu `unidade_id` está envolvido (como `unidade_origem_id` ou `unidade_destino_id`).
    * `almoxarife_central`: Pode ver movimentações para *qualquer* `unidadeId`.
* **Parâmetros:**
    * `unidadeId` (Parâmetro de Caminho): O ID da unidade hospitalar.
* **Parâmetros de Consulta (Opcional):**
    * `insumoId` (Número): Filtra as movimentações por um ID de suprimento médico específico.
    * `periodo` (Número): Filtra as movimentações por um período em dias (por exemplo, `7` para os últimos 7 dias).
* **Descrição:** Este endpoint busca registros de movimentação relevantes para a `unidadeId` especificada. Inclui detalhes como `insumo_nome`, `numero_lote`, `responsavel_nome`, `unidade_origem_nome` e `unidade_destino_nome`. Suporta filtragem por `insumoId` e `periodo`.
* **Resposta:**
    * `200 OK`: Um array de objetos de movimentação relevantes para a `unidadeId`.
    * `403 Forbidden`: Se um `almoxarife_local` tentar acessar movimentações fora de sua unidade.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.