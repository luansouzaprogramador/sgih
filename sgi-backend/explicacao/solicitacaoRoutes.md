# Rotas de Agendamento

Este arquivo (`agendamentoRoutes.js`) define os endpoints da API para gerenciar "agendamentos" (transferências ou movimentações agendadas) de suprimentos médicos entre unidades hospitalares. Isso inclui a criação de novos agendamentos, a recuperação de agendamentos e a atualização de seu status.

## Caminho Base

Todas as rotas definidas neste arquivo são tipicamente prefixadas com `/api/agendamentos` (assumindo que estão montadas sob este caminho na aplicação principal).

## Autenticação e Autorização

* Todas as rotas exigem autenticação via middleware `authenticateToken`.
* A criação e atualização do status dos agendamentos são restritas ao `almoxarife_central`.
* A recuperação de agendamentos possui diferentes níveis de acesso com base nas funções do usuário.

## Dependências

* `express`: Framework web.
* `../database`: Pool de conexão com o banco de dados.
* `../middleware/auth`: Middleware de autenticação e autorização.
* `../utils/alertService`: Utilitário para verificar e criar alertas (por exemplo, estoque crítico).

## Endpoints

### 1. Obter Todos os Agendamentos (Somente Almoxarife Central)

Recupera uma lista abrangente de todas as transferências agendadas em todas as unidades.

* **URL:** `GET /`
* **Autenticação:** Obrigatória
* **Autorização:** Somente `almoxarife_central`
* **Descrição:** Este endpoint busca todas as transferências agendadas, incluindo detalhes sobre os itens sendo transferidos, as unidades de origem e destino, e o usuário responsável. Ele agrega os itens de cada agendamento em uma única string para exibição.
* **Resposta:**
    * `200 OK`: Um array de objetos de transferência agendada.
    * `403 Forbidden`: Se o usuário autenticado não for um `almoxarife_central`.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

### 2. Obter Agendamentos para uma Unidade Específica

Recupera transferências agendadas relacionadas a uma unidade hospitalar específica, onde a unidade é a origem ou o destino da transferência.

* **URL:** `GET /:unidadeId`
* **Autenticação:** Obrigatória
* **Autorização:**
    * `almoxarife_local`: Só pode ver transferências agendadas onde seu `unidade_id` está envolvido (como `unidade_origem_id` ou `unidade_destino_id`).
    * `almoxarife_central`: Pode ver transferências agendadas para *qualquer* `unidadeId`.
* **Parâmetros:**
    * `unidadeId` (Parâmetro de Caminho): O ID da unidade hospitalar.
* **Descrição:** Este endpoint busca registros de transferência agendada relevantes para a `unidadeId` especificada. Inclui detalhes semelhantes ao endpoint `GET /` geral, mas filtrado pela unidade.
* **Resposta:**
    * `200 OK`: Um array de objetos de transferência agendada relevantes para a `unidadeId`.
    * `403 Forbidden`: Se um `almoxarife_local` tentar acessar transferências agendadas fora de sua unidade.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

### 3. Criar um Novo Agendamento

Cria uma nova transferência agendada de suprimentos médicos entre duas unidades hospitalares.

* **URL:** `POST /`
* **Autenticação:** Obrigatória
* **Authorization:** Somente `almoxarife_central`
* **Corpo da Requisição (JSON):**
    ```json
    {
      "unidade_origem_id": 1,
      "unidade_destino_id": 2,
      "data_agendamento": "2024-07-20",
      "observacao": "Transferência de rotina para suprir demanda.",
      "itens": [
        {
          "lote_id": 101,
          "quantidade": 10
        },
        {
          "lote_id": 105,
          "quantidade": 5
        }
      ]
    }
    ```
    * `unidade_origem_id` (Número, Obrigatório): O ID da unidade hospitalar de origem.
    * `unidade_destino_id` (Número, Obrigatório): O ID da unidade hospitalar de destino.
    * `data_agendamento` (String, Obrigatório): A data agendada para a transferência (formato AAAA-MM-DD).
    * `observacao` (String, Opcional): Quaisquer notas adicionais para a transferência.
    * `itens` (Array de Objetos, Obrigatório): Uma lista de itens a serem transferidos.
        * Cada objeto de item deve ter:
            * `lote_id` (Número, Obrigatório): O ID do lote de onde os itens estão sendo transferidos.
            * `quantidade` (Número, Obrigatório): A quantidade de itens desse lote.
* **Descrição:** Este endpoint lida com a criação de uma nova transferência agendada. Ele executa os seguintes passos dentro de uma transação de banco de dados:
    1. Insere o registro principal do agendamento na tabela `agendamentos` com status `pendente`.
    2. Para cada item no array `itens`:
        * Insere o item na tabela `agendamento_itens`.
        * Decrementa a `quantidade_atual` do `lote_id` especificado na `unidade_origem_id`.
        * Registra um movimento de `transferencia` na tabela `movimentacoes`.
    Inclui verificações para estoque suficiente e IDs de unidade válidos.
* **Resposta:**
    * `201 Created`: Se a transferência agendada for criada com sucesso. Retorna `{"message": "Agendamento criado com sucesso!", "agendamentoId": <id>}`.
    * `400 Bad Request`: Se campos obrigatórios estiverem faltando, unidades de origem e destino forem as mesmas, ou quantidade insuficiente em um lote.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante a transação.

### 4. Atualizar Status do Agendamento

Atualiza o status de uma transferência agendada existente. Este endpoint também lida com a movimentação real de estoque quando uma transferência é concluída ou cancelada.

* **URL:** `PUT /:id/status`
* **Autenticação:** Obrigatória
* **Autorização:** Somente `almoxarife_central`
* **Parâmetros:**
    * `id` (Parâmetro de Caminho): O ID da transferência agendada a ser atualizada.
* **Corpo da Requisição (JSON):**
    ```json
    {
      "status": "concluido"
    }
    ```
    * `status` (String, Obrigatório): O novo status para a transferência agendada. Valores válidos são:
        * `'em_transito'` (em trânsito)
        * `'concluido'` (concluído)
        * `'cancelado'` (cancelado)
* **Descrição:** Este endpoint permite que um almoxarife central atualize o status de uma transferência agendada. Inclui lógica de negócios para transições de status e ajustes de estoque:
    * **Transições de Status:** Impõe transições válidas (por exemplo, `em_transito` somente de `pendente`, `concluido` somente de `em_transito`, `cancelado` de `pendente` ou `em_transito`).
    * **Status `concluido`:** Quando uma transferência é marcada como `concluido`:
        * Ele itera através de `agendamento_itens`.
        * Para cada item, verifica se um lote ativo correspondente já existe na `unidade_destino_id` (mesmo insumo, mesmo número de lote). Se existir, a `quantidade_atual` desse lote é incrementada.
        * Se nenhum lote desse tipo existir na unidade de destino, um *novo* lote é criado na unidade de destino com a quantidade transferida, herdando detalhes como `insumo_id`, `numero_lote` e `data_validade` do lote original.
        * Um movimento de `entrada` é registrado na tabela `movimentacoes` para a unidade de destino.
    * **Status `cancelado`:** Se uma transferência for marcada como `cancelado`:
        * Ele itera através de `agendamento_itens`.
        * A `quantidade_atual` para cada item é *retornada* (restaurada) para o `lote_id` original na `unidade_origem_id`.
        * Um movimento de `estorno_cancelamento` (estorno/cancelamento) é opcionalmente registrado.
    Todas as operações são realizadas dentro de uma transação de banco de dados para garantir a consistência dos dados.
* **Resposta:**
    * `200 OK`: Se o status for atualizado com sucesso. Retorna `{"message": "Status do agendamento atualizado para <status> com sucesso."}`.
    * `400 Bad Request`: Se um valor de status inválido for fornecido ou uma transição de status inválida for tentada.
    * `404 Not Found`: Se a transferência agendada com o `id` fornecido não for encontrada.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante a atualização ou ajustes de estoque.