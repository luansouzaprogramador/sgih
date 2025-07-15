# Rotas de Lote

Este arquivo (`loteRoutes.js`) define os endpoints da API para gerenciar "lotes" (lotes de suprimentos médicos). Isso inclui a recuperação de lotes, o registro da entrada (input) e saída (output) de suprimentos, e a atualização dos status dos lotes.

## Caminho Base

Todas as rotas definidas neste arquivo são tipicamente prefixadas com `/api/lotes` (assumindo que estão montadas sob este caminho na aplicação principal).

## Autenticação e Autorização

* Todas as rotas exigem autenticação via middleware `authenticateToken`.
* Rotas específicas (`POST /entrada`, `POST /saida`, `PUT /:id/status`) também impõem autorização baseada em função usando `authorizeRoles`.

## Dependências

* `express`: Framework web.
* `moment`: Biblioteca para manipulação de data/hora.
* `../database`: Pool de conexão com o banco de dados.
* `../middleware/auth`: Middleware de autenticação e autorização.
* `../utils/alertService`: Utilitário para verificar e criar alertas (por exemplo, estoque crítico).

## Endpoints

### 1. Obter Lotes para uma Unidade Específica

Recupera uma lista de todos os lotes ativos para uma determinada unidade hospitalar.

* **URL:** `GET /:unidadeId`
* **Autenticação:** Obrigatória
* **Autorização:**
    * `almoxarife_central`: Pode visualizar lotes para *qualquer* `unidadeId`.
    * `almoxarife_local`: Pode visualizar lotes apenas para sua *própria* `unidadeId`.
* **Parâmetros:**
    * `unidadeId` (Parâmetro de Caminho): O ID da unidade hospitalar.
* **Descrição:** Este endpoint busca todos os lotes associados à `unidadeId` especificada, juntamente com o `insumo_nome` (nome do suprimento). Ele também aciona uma verificação e criação de alertas relevantes para essa unidade (por exemplo, alertas de estoque crítico).
* **Resposta:**
    * `200 OK`: Um array de objetos de lote.
    * `403 Forbidden`: Se um `almoxarife_local` tentar acessar lotes de uma unidade diferente da sua.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados ou a verificação de alertas.

### 2. Registrar Entrada de Lote (Entrada)

Registra a entrada de novos suprimentos médicos em um lote ou atualiza um lote existente.

* **URL:** `POST /entrada`
* **Autenticação:** Obrigatória
* **Autorização:** `almoxarife_central`, `almoxarife_local` ou `gestor`
* **Corpo da Requisição (JSON):**
    ```json
    {
      "insumo_id": 1,
      "numero_lote": "LOTE2023001",
      "data_validade": "2025-12-31",
      "quantidade": 100,
      "unidade_id": 1
    }
    ```
    * `insumo_id` (Número, Obrigatório): O ID do suprimento médico.
    * `numero_lote` (String, Obrigatório): O número do lote.
    * `data_validade` (String, Obrigatório): A data de validade do lote (formato YYYY-MM-DD recomendado).
    * `quantidade` (Número, Obrigatório): A quantidade de itens que estão entrando.
    * `unidade_id` (Número, Obrigatório): O ID da unidade hospitalar que está recebendo os suprimentos.
* **Descrição:** Este endpoint lida com a entrada de suprimentos.
    * Primeiro, verifica se o `insumo_id` e a `unidade_id` existem.
    * Se um lote *ativo* com o mesmo `insumo_id`, `numero_lote` e `unidade_id` já existir, sua `quantidade_atual` é incrementada pela `quantidade` fornecida. A `data_validade` do lote existente é atualizada *apenas se a nova `data_validade` for posterior*.
    * Se nenhum lote ativo desse tipo existir, um novo registro de lote é criado com `status: 'ativo'`.
    * Um movimento de 'entrada' é sempre registrado na tabela `movimentacoes`.
* **Resposta:**
    * `200 OK`: Se um lote existente foi atualizado. Retorna `{"message": "Lote atualizado com sucesso e quantidade adicionada.", "loteId": <id>}`.
    * `201 Created`: Se um novo lote foi criado. Retorna `{"message": "Lote criado com sucesso.", "loteId": <id>}`.
    * `404 Not Found`: Se o `insumo_id` ou `unidade_id` especificado não existir.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante a operação.

### 3. Registrar Saída de Lote (Saída)

Registra a saída (consumo ou transferência) de suprimentos médicos de um lote.

* **URL:** `POST /saida`
* **Autenticação:** Obrigatória
* **Autorização:** `almoxarife_central` ou `almoxarife_local`
* **Corpo da Requisição (JSON):**
    ```json
    {
      "lote_id": 101,
      "quantidade_saida": 5,
      "unidade_origem_id": 1
    }
    ```
    * `lote_id` (Número, Obrigatório): O ID do lote de onde os itens estão saindo.
    * `quantidade_saida` (Número, Obrigatório): A quantidade de itens saindo.
    * `unidade_origem_id` (Número, Obrigatório): O ID da unidade hospitalar de onde os suprimentos estão saindo.
* **Descrição:** Este endpoint lida com a saída de suprimentos de um lote.
    * Primeiro, verifica se o `lote_id` existe dentro da `unidade_origem_id` especificada.
    * Verifica se o lote expirou (`data_validade` está no passado).
    * Garante que há `quantidade_atual` suficiente no lote para cobrir a `quantidade_saida`.
    * Se todas as verificações passarem, a `quantidade_atual` do lote é decrementada.
    * Um movimento de 'saida' é registrado na tabela `movimentacoes`.
* **Resposta:**
    * `200 OK`: Se a saída for registrada com sucesso. Retorna `{"message": "Saída de lote registrada com sucesso.", "newQuantity": <new_quantity>}`.
    * `400 Bad Request`: Se o lote estiver vencido ou se a quantidade for insuficiente.
    * `403 Forbidden`: Se um `almoxarife_local` tentar registrar uma saída de uma unidade diferente da sua.
    * `404 Not Found`: Se o lote não for encontrado na unidade especificada.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor.

### 4. Atualizar Status do Lote

Atualiza o status de um lote específico de suprimento médico.

* **URL:** `PUT /:id/status`
* **Autenticação:** Obrigatória
* **Autorização:** Somente `almoxarife_central`
* **Parâmetros:**
    * `id` (Parâmetro de Caminho): O ID do lote a ser atualizado.
* **Corpo da Requisição (JSON):**
    ```json
    {
      "status": "baixo"
    }
    ```
    * `status` (String, Obrigatório): O novo status do lote. Valores válidos são:
        * `'ativo'` (ativo)
        * `'baixo'` (estoque baixo)
        * `'vencido'` (vencido)
* **Descrição:** Este endpoint permite que um almoxarife central atualize manualmente o status de um lote.
* **Resposta:**
    * `200 OK`: Se o status for atualizado com sucesso. Retorna `{"message": "Status do lote atualizado com sucesso."}`.
    * `400 Bad Request`: Se um valor de status inválido for fornecido.
    * `404 Not Found`: Se o lote com o `id` fornecido não for encontrado.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante a atualização.