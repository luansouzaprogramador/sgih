# Rotas de Unidade Hospitalar

Este arquivo (`unitRoutes.js`) define os endpoints da API para gerenciar "unidades hospitalares" (unidades hospitalares) dentro do sistema. Isso inclui a recuperação, criação, atualização e exclusão de registros de unidades.

## Caminho Base

Todas as rotas definidas neste arquivo são tipicamente prefixadas com `/api/unidades` (assumindo que estão montadas sob este caminho na aplicação principal).

## Autenticação e Autorização

* Todas as rotas exigem autenticação via middleware `authenticateToken`.
* A criação, atualização e exclusão de unidades são restritas a usuários com a função `gestor` (gerente) usando o middleware `authorizeRoles`.

## Dependências

* `express`: Framework web.
* `../database`: Pool de conexão com o banco de dados.
* `../middleware/auth`: Middleware de autenticação e autorização.

## Endpoints

### 1. Obter Todas as Unidades Hospitalares

Recupera uma lista de todas as unidades hospitalares registradas.

* **URL:** `GET /`
* **Autenticação:** Obrigatória
* **Autorização:** Qualquer usuário autenticado.
* **Descrição:** Este endpoint busca todos os registros da tabela `unidades_hospitalares`.
* **Resposta:**
    * `200 OK`: Um array de objetos de unidade hospitalar.
    * `500 Internal Server Error`: Se ocorrer um erro durante a consulta ao banco de dados.

### 2. Criar uma Nova Unidade Hospitalar

Registra uma nova unidade hospitalar no sistema.

* **URL:** `POST /`
* **Autenticação:** Obrigatória
* **Autorização:** `gestor`
* **Corpo da Requisição (JSON):**
    ```json
    {
      "nome": "Hospital Central",
      "endereco": "Rua Principal, 123",
      "telefone": "11987654321",
      "email": "hospital.central@example.com"
    }
    ```
    * `nome` (String, Obrigatório): O nome da unidade hospitalar.
    * `endereco` (String, Obrigatório): O endereço físico da unidade.
    * `telefone` (String, Obrigatório): O número de telefone de contato.
    * `email` (String, Obrigatório): O endereço de e-mail de contato.
* **Descrição:** Este endpoint insere um novo registro na tabela `unidades_hospitalares`.
* **Resposta:**
    * `201 Created`: Se a unidade for criada com sucesso. Retorna `{"message": "Unit created successfully", "unitId": <id>}`.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante a criação.

### 3. Atualizar uma Unidade Hospitalar

Atualiza os detalhes de uma unidade hospitalar existente.

* **URL:** `PUT /:id`
* **Autenticação:** Obrigatória
* **Autorização:** `gestor`
* **Parâmetros:**
    * `id` (Parâmetro de Caminho): O ID da unidade a ser atualizada.
* **Corpo da Requisição (JSON):**
    ```json
    {
      "nome": "Hospital Central (Atualizado)",
      "endereco": "Rua Secundária, 456",
      "telefone": "11999998888",
      "email": "novo.email@example.com"
    }
    ```
    * `nome` (String, Opcional): O nome atualizado.
    * `endereco` (String, Opcional): O endereço atualizado.
    * `telefone` (String, Opcional): O número de telefone atualizado.
    * `email` (String, Opcional): O endereço de e-mail atualizado.
* **Descrição:** Este endpoint atualiza um registro existente na tabela `unidades_hospitalares` com base no `id` fornecido.
* **Resposta:**
    * `200 OK`: Se a unidade for atualizada com sucesso. Retorna `{"message": "Unidade atualizada com sucesso."}`.
    * `404 Not Found`: Se a unidade com o `id` fornecido não for encontrada.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante a atualização.

### 4. Excluir uma Unidade Hospitalar

Exclui uma unidade hospitalar do sistema.

* **URL:** `DELETE /:id`
* **Autenticação:** Obrigatória
* **Autorização:** `gestor`
* **Parâmetros:**
    * `id` (Parâmetro de Caminho): O ID da unidade a ser excluída.
* **Descrição:** Este endpoint tenta excluir uma unidade hospitalar. Para manter a integridade dos dados, ele primeiro verifica se a unidade está vinculada a quaisquer `usuarios` (usuários) ou `lotes` (lotes de suprimentos) existentes. Se estiver, a exclusão é impedida.
* **Resposta:**
    * `200 OK`: Se a unidade for excluída com sucesso. Retorna `{"message": "Unidade excluída com sucesso."}`.
    * `400 Bad Request`: Se a unidade estiver vinculada a usuários ou lotes existentes e não puder ser excluída. Retorna mensagens como `{"message": "Não é possível excluir. Esta unidade está vinculada a usuários."}` ou `{"message": "Não é possível excluir. Esta unidade está vinculada a lotes."}`.
    * `404 Not Found`: Se a unidade com o `id` fornecido não for encontrada.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante o processo de exclusão.