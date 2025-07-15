# Rotas de Autenticação

Este arquivo (`authRoutes.js`) define os endpoints da API responsáveis pelo registro e login de usuários no sistema.

## Caminho Base

Todas as rotas definidas neste arquivo são tipicamente prefixadas com `/api/auth` (assumindo que estão montadas sob este caminho na aplicação principal).

## Dependências

* `express`: Framework web.
* `bcryptjs`: Biblioteca para hashing de senhas.
* `jsonwebtoken`: Biblioteca para criação e verificação de JSON Web Tokens (JWTs).
* `../database`: Pool de conexão com o banco de dados.
* `dotenv`: Usado para carregar variáveis de ambiente (por exemplo, `JWT_SECRET`).

## Endpoints

### 1. Registro de Usuário

Registra um novo usuário no sistema.

* **URL:** `POST /register`
* **Autenticação:** Não necessária (este é o endpoint de registro).
* **Corpo da Requisição (JSON):**
    ```json
    {
      "nome": "John Doe",
      "email": "john.doe@example.com",
      "senha": "securepassword123",
      "tipo_usuario": "almoxarife_local",
      "unidade_id": 1
    }
    ```
    * `nome` (String, Obrigatório): O nome completo do usuário.
    * `email` (String, Obrigatório): O endereço de e-mail único do usuário.
    * `senha` (String, Obrigatório): A senha do usuário.
    * `tipo_usuario` (String, Obrigatório): O tipo de usuário (por exemplo, `almoxarife_local`, `almoxarife_central`).
    * `unidade_id` (Número, Obrigatório): O ID da unidade hospitalar à qual o usuário está associado.
* **Descrição:** Este endpoint recebe os detalhes do usuário, faz o hash da senha usando `bcryptjs` e insere o novo usuário na tabela `usuarios`.
* **Resposta:**
    * `201 Created`: Se o usuário for registrado com sucesso. Retorna `{"message": "User registered successfully", "userId": <id>}`.
    * `409 Conflict`: Se o e-mail fornecido já estiver registrado (código de erro `ER_DUP_ENTRY`).
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante o registro.

### 2. Login de Usuário

Autentica um usuário e retorna um JSON Web Token (JWT).

* **URL:** `POST /login`
* **Autenticação:** Não necessária (este é o endpoint de login).
* **Corpo da Requisição (JSON):**
    ```json
    {
      "email": "john.doe@example.com",
      "senha": "securepassword123"
    }
    ```
    * `email` (String, Obrigatório): O endereço de e-mail do usuário.
    * `senha` (String, Obrigatório): A senha do usuário.
* **Descrição:** Este endpoint verifica o e-mail e a senha fornecidos em relação às credenciais de usuário armazenadas. Se válidos, ele gera um JWT contendo o `userId`, `email`, `tipo_usuario` e `unidade_id` do usuário, válido por 1 hora.
* **Resposta:**
    * `200 OK`: Se o login for bem-sucedido. Retorna `{"message": "Logged in successfully", "token": "<jwt_token>", "user": {id, nome, email, tipo_usuario, unidade_id}}`.
    * `400 Bad Request`: Se credenciais inválidas (e-mail não encontrado ou senha incorreta) forem fornecidas.
    * `500 Internal Server Error`: Se ocorrer um erro do lado do servidor durante o login.