# Rotas de Agendamento

Este arquivo (`agendamentoRoutes.js`) define os endpoints da API para gerenciar "agendamentos" (compromissos ou transferências programadas) dentro do sistema. Essas rotas lidam com a criação, recuperação e atualização de status de transferências programadas de suprimentos médicos entre unidades hospitalares.

## Caminho Base

Todas as rotas definidas neste arquivo são tipicamente prefixadas com `/api/agendamentos` (assumindo que estão montadas sob este caminho na aplicação principal).

## Autenticação e Autorização

* Todas as rotas exigem autenticação via middleware `authenticateToken`.
* A maioria das rotas também impõe autorização baseada em função usando `authorizeRoles`, tipicamente restringindo o acesso a `almoxarife_central` (almoxarife central) ou, em alguns casos, permitindo `almoxarife_local` (almoxarife local) com restrições específicas.

## Endpoints

### 1. Obter Todos os Agendamentos (Almoxarife Central)

Recupera uma lista de todas as transferências programadas.

* **URL:** `GET /`
* **Autenticação:** Obrigatória
* **Autorização:** `almoxarife_central`
* **Descrição:** Este endpoint busca todos os agendamentos, incluindo detalhes sobre os itens, unidades de origem e destino e o usuário responsável.
* **Resposta:**
    * `200 OK`: Um array de objetos de agendamento.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

### 2. Obter Agendamentos para uma Unidade Específica (Almoxarife Local / Visualização por Unidade)

Recupera transferências programadas relacionadas a uma unidade hospitalar específica.

* **URL:** `GET /:unidadeId`
* **Autenticação:** Obrigatória
* **Autorização:**
    * `almoxarife_local`: Pode visualizar agendamentos apenas para sua *própria* `unidadeId`.
    * `almoxarife_central`: Pode visualizar agendamentos para *qualquer* `unidadeId` (embora a rota geral `/` possa ser mais prática para eles).
* **Parâmetros:**
    * `unidadeId` (Parâmetro de Caminho): O ID da unidade hospitalar.
* **Descrição:** Este endpoint filtra os agendamentos para mostrar apenas aqueles em que a `unidadeId` especificada é a origem ou o destino.
* **Resposta:**
    * `200 OK`: Um array de objetos de agendamento relevantes para a `unidadeId`.
    * `403 Forbidden`: Se um `almoxarife_local` tentar acessar agendamentos fora de sua unidade.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

### 3. Criar um Novo Agendamento

Cria uma nova transferência programada.

* **URL:** `POST /`
* **Autenticação:** Obrigatória
* **Autorização:** `almoxarife_central`
* **Corpo da Requisição (JSON):**
    ```json
    {
      "unidade_origem_id": 1,
      "unidade_destino_id": 2,
      "data_agendamento": "2025-07-20T10:00:00Z",
      "observacao": "Transferência de rotina para unidade B.",
      "itens": [
        {
          "lote_id": 101,
          "quantidade": 5
        },
        {
          "lote_id": 102,
          "quantidade": 10
        }
      ]
    }
    ```
    * `unidade_origem_id` (Número, Obrigatório): O ID da unidade hospitalar de origem.
    * `unidade_destino_id` (Número, Obrigatório): O ID da unidade hospitalar de destino.
    * `data_agendamento` (String, Obrigatório): A data e hora programadas da transferência.
    * `observacao` (String, Opcional): Quaisquer notas adicionais para a transferência.
    * `itens` (Array de Objetos, Obrigatório): Uma lista de itens a serem transferidos.
        * `lote_id` (Número, Obrigatório): O ID do lote do suprimento médico.
        * `quantidade` (Número, Obrigatório): A quantidade do item a ser transferida deste lote.
* **Descrição:** Este endpoint lida com a criação de um novo agendamento. Ele executa as seguintes operações dentro de uma transação de banco de dados:
    1.  Insere o registro principal do agendamento.
    2.  Para cada item no array `itens`:
        * Insere o item na tabela `agendamento_itens`.
        * Atualiza a `quantidade_atual` (quantidade atual) do lote na `unidade_origem_id`, diminuindo-a pelo valor transferido.
        * Registra um movimento do tipo 'transferencia' na tabela `movimentacoes` para a unidade de origem (saída).
* **Tratamento de Erros:**
    * Verifica campos obrigatórios ausentes.
    * Garante que `unidade_origem_id` não seja o mesmo que `unidade_destino_id`.
    * Verifica quantidade suficiente de itens no lote de origem antes de deduzir.
* **Resposta:**
    * `201 Created`: Se o agendamento for criado com sucesso. Retorna `{"message": "Agendamento criado com sucesso!", "agendamentoId": <id>}`.
    * `400 Bad Request`: Se campos obrigatórios estiverem faltando, unidades forem as mesmas ou um item for inválido/insuficiente.
    * `500 Internal Server Error`: Se ocorrer um erro de banco de dados ou outro erro do lado do servidor durante a transação.

### 4. Atualizar Status do Agendamento

Atualiza o status de uma transferência programada específica.

* **URL:** `PUT /:id/status`
* **Autenticação:** Obrigatória
* **Autorização:** `almoxarife_central`
* **Parâmetros:**
    * `id` (Parâmetro de Caminho): O ID do agendamento a ser atualizado.
* **Corpo da Requisição (JSON):**
    ```json
    {
      "status": "em_transito"
    }
    ```
    * `status` (String, Obrigatório): O novo status do agendamento. Valores válidos são:
        * `'em_transito'` (em trânsito)
        * `'concluido'` (concluído)
        * `'cancelado'` (cancelado)
* **Descrição:** Este endpoint permite que um almoxarife central atualize o status de um agendamento. Ele inclui lógica de negócios específica para transições de status e lida com ajustes de inventário de acordo:
    * **Transições de Status:** Impõe transições válidas (por exemplo, não pode ir de 'concluido' para 'em_transito').
    * **Se o `status` for `'concluido'`:**
        * Para cada item no agendamento:
            * Verifica se o lote já existe na `unidade_destino_id`.
            * Se sim, atualiza a `quantidade_atual` do lote existente na unidade de destino (incrementa).
            * Se não, cria uma nova entrada de lote na tabela `lotes` para a unidade de destino com a quantidade transferida.
            * Registra um movimento do tipo 'entrada' na tabela `movimentacoes` para a unidade de destino (entrada).
    * **Se o `status` for `'cancelado'`:**
        * Para cada item no agendamento:
            * Adiciona a `quantidade` de volta à `quantidade_atual` do lote original na `unidade_origem_id` (efetivamente "devolvendo" os itens).
            * Opcionalmente, registra um movimento do tipo 'estorno_cancelamento' (reversão de cancelamento).
* **Resposta:**
    * `200 OK`: Se o status for atualizado com sucesso. Retorna `{"message": "Status do agendamento atualizado para <status> com sucesso."}`.
    * `400 Bad Request`: Se um status inválido for fornecido ou uma transição de status inválida for tentada.
    * `500 Internal Server Error`: Se o agendamento não for encontrado, ou ocorrer um erro de banco de dados ou outro erro do lado do servidor durante a transação.

## Dependências

* `express`: Framework web.
* `../database`: Pool de conexão com o banco de dados.
* `../middleware/auth`: Middleware de autenticação e autorização.
* `../utils/alertService`: (Comentado no código fornecido, mas tipicamente usado para geração de alertas).