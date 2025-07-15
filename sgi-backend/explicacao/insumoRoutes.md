# Rotas de Insumo

Este arquivo (`insumoRoutes.js`) define os endpoints da API para gerenciar "insumos" (suprimentos médicos ou consumíveis) dentro do sistema.

## Caminho Base

Todas as rotas definidas neste arquivo são tipicamente prefixadas com `/api/insumos` (assumindo que estão montadas sob este caminho na aplicação principal).

## Autenticação e Autorização

* Todas as rotas exigem autenticação via middleware `authenticateToken`.
* A criação, atualização e exclusão de insumos são restritas a usuários com as funções `almoxarife_central` ou `almoxarife_local` usando o middleware `authorizeRoles`.

## Endpoints

### 1. Obter Todos os Insumos

Recupera uma lista de todos os suprimentos médicos.

* **URL:** `GET /`
* **Autenticação:** Obrigatória
* **Autorização:** Qualquer usuário autenticado.
* **Descrição:** Este endpoint busca todos os registros da tabela `insumos`.
* **Resposta:**
    * `200 OK`: Um array de objetos de insumo.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

### 2. Criar um Novo Insumo

Registra um novo suprimento médico no sistema.

* **URL:** `POST /`
* **Autenticação:** Obrigatória
* **Autorização:** `almoxarife_central` ou `almoxarife_local`
* **Corpo da Requisição (JSON):**
    ```json
    {
      "nome": "Luva Cirúrgica Tamanho M",
      "descricao": "Luvas estéreis de látex para procedimentos cirúrgicos",
      "unidade_medida": "Par",
      "local_armazenamento": "Armário 3, Prateleira B"
    }
    ```
    * `nome` (String, Obrigatório): O nome do suprimento médico.
    * `descricao` (String, Opcional): Uma breve descrição do suprimento.
    * `unidade_medida` (String, Obrigatório): A unidade de medida (por exemplo, "Unidade", "Par", "Caixa").
    * `local_armazenamento` (String, Opcional): O local de armazenamento designado para o suprimento.
* **Descrição:** Este endpoint insere um novo registro na tabela `insumos`.
* **Resposta:**
    * `201 Created`: Se o insumo for criado com sucesso. Retorna `{"message": "Insumo created successfully", "insumoId": <id>}`.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante a criação.

### 3. Atualizar um Insumo

Atualiza os detalhes de um suprimento médico existente.

* **URL:** `PUT /:id`
* **Autenticação:** Obrigatória
* **Autorização:** `almoxarife_central` ou `almoxarife_local`
* **Parâmetros:**
    * `id` (Parâmetro de Caminho): O ID do insumo a ser atualizado.
* **Corpo da Requisição (JSON):**
    ```json
    {
      "nome": "Luva Cirúrgica Tamanho M (Atualizada)",
      "descricao": "Luvas estéreis de látex para procedimentos cirúrgicos - Nova Descrição",
      "unidade_medida": "Par",
      "local_armazenamento": "Armário 3, Prateleira C"
    }
    ```
    * `nome` (String, Opcional): O nome atualizado do suprimento médico.
    * `descricao` (String, Opcional): A descrição atualizada.
    * `unidade_medida` (String, Opcional): A unidade de medida atualizada.
    * `local_armazenamento` (String, Opcional): O local de armazenamento atualizado.
* **Descrição:** Este endpoint atualiza um registro existente na tabela `insumos` com base no `id` fornecido.
* **Resposta:**
    * `200 OK`: Se o insumo for atualizado com sucesso. Retorna `{"message": "Insumo atualizado com sucesso."}`.
    * `404 Not Found`: Se o insumo com o `id` fornecido não for encontrado.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante a atualização.

### 4. Excluir um Insumo

Exclui um suprimento médico do sistema.

* **URL:** `DELETE /:id`
* **Autenticação:** Obrigatória
* **Autorização:** `almoxarife_central` ou `almoxarife_local`
* **Parâmetros:**
    * `id` (Parâmetro de Caminho): O ID do insumo a ser excluído.
* **Descrição:** Este endpoint tenta excluir um insumo. Antes da exclusão, ele verifica se o insumo está vinculado a quaisquer `lotes` (lotes) existentes. Se estiver, a exclusão é impedida para manter a integridade dos dados.
* **Resposta:**
    * `200 OK`: Se o insumo for excluído com sucesso. Retorna `{"message": "Insumo excluído com sucesso."}`.
    * `400 Bad Request`: Se o insumo estiver vinculado a lotes existentes e não puder ser excluído. Retorna `{"message": "Não é possível excluir. Este insumo está vinculado a lotes."}`.
    * `404 Not Found`: Se o insumo com o `id` fornecido não for encontrado.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante o processo de exclusão.

## Dependências

* `express`: Framework web.
* `../database`: Pool de conexão com o banco de dados.
* `../middleware/auth`: Middleware de autenticação e autorização.