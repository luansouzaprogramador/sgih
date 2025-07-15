# Rotas de Usuário

Este arquivo (`userRoutes.js`) define os endpoints da API para gerenciar contas de usuário dentro do sistema. Isso inclui a recuperação, atualização e exclusão de registros de usuário. O registro e login de usuários são tratados em `authRoutes.js`.

## Caminho Base

Todas as rotas definidas neste arquivo são tipicamente prefixadas com `/api/users` (assumindo que estão montadas sob este caminho na aplicação principal).

## Autenticação e Autorização

* Todas as rotas exigem autenticação via middleware `authenticateToken`.
* O acesso a essas rotas é geralmente restrito à função `gestor` (gerente) usando o middleware `authorizeRoles`, garantindo que apenas pessoal autorizado possa gerenciar contas de usuário.

## Dependências

* `express`: Framework web.
* `../database`: Pool de conexão com o banco de dados.
* `../middleware/auth`: Middleware de autenticação e autorização.

## Endpoints

### 1. Obter Todos os Usuários

Recupera uma lista de todos os usuários registrados no sistema.

* **URL:** `GET /`
* **Autenticação:** Obrigatória
* **Autorização:** `gestor`
* **Descrição:** Este endpoint busca todos os registros de usuário da tabela `usuarios`, excluindo informações sensíveis como senhas. Inclui `id`, `nome`, `email`, `tipo_usuario` e `unidade_id`.
* **Resposta:**
    * `200 OK`: Um array de objetos de usuário.
    * `403 Forbidden`: Se o usuário autenticado não for um `gestor`.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

### 2. Atualizar um Usuário

Atualiza os detalhes de uma conta de usuário existente.

* **URL:** `PUT /:id`
* **Autenticação:** Obrigatória
* **Autorização:** `gestor`
* **Parâmetros:**
    * `id` (Parâmetro de Caminho): O ID do usuário a ser atualizado.
* **Corpo da Requisição (JSON):**
    ```json
    {
      "nome": "Jane Doe Atualizada",
      "email": "jane.doe.updated@example.com",
      "tipo_usuario": "almoxarife_central",
      "unidade_id": 2
    }
    ```
    * `nome` (String, Opcional): O nome atualizado do usuário.
    * `email` (String, Opcional): O endereço de e-mail atualizado do usuário. Deve ser único.
    * `tipo_usuario` (String, Opcional): O tipo de usuário atualizado (por exemplo, `almoxarife_local`, `almoxarife_central`, `gestor`, `profissional_saude`).
    * `unidade_id` (Número, Opcional): O ID atualizado da unidade hospitalar à qual o usuário está associado.
* **Descrição:** Este endpoint atualiza um registro existente na tabela `usuarios` com base no `id` fornecido. Inclui uma verificação de endereços de e-mail duplicados.
* **Resposta:**
    * `200 OK`: Se o usuário for atualizado com sucesso. Retorna `{"message": "Usuário atualizado com sucesso."}`.
    * `404 Not Found`: Se o usuário com o `id` fornecido não for encontrado.
    * `409 Conflict`: Se o e-mail fornecido já estiver em uso por outro usuário.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante a atualização.

### 3. Excluir um Usuário

Exclui uma conta de usuário do sistema.

* **URL:** `DELETE /:id`
* **Autenticação:** Obrigatória
* **Autorização:** `gestor`
* **Parâmetros:**
    * `id` (Parâmetro de Caminho): O ID do usuário a ser excluído.
* **Descrição:** Este endpoint tenta excluir um usuário.
* **Resposta:**
    * `200 OK`: Se o usuário for excluído com sucesso. Retorna `{"message": "Usuário excluído com sucesso."}`.
    * `404 Not Found`: Se o usuário com o `id` fornecido não for encontrado.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante a exclusão.