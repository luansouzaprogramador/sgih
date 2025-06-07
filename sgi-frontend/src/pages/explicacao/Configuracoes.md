# Componente de Gestão de Usuários (Configuracoes.jsx)

O componente `Configuracoes` é a página administrativa dedicada à gestão de usuários do sistema. Ele permite que o `almoxarife_central` (administrador do sistema) cadastre novos usuários, visualize a lista de usuários existentes, edite suas informações (incluindo senha e tipo de usuário) e os exclua.

## Funcionalidades

- **Cadastro de Usuários**: Um formulário permite adicionar novos usuários ao sistema, solicitando:
  - Nome
  - Email
  - Senha
  - Tipo de Usuário (Gestor, Almoxarife Local, Almoxarife Central, Profissional de Saúde)
  - Unidade Hospitalar (se aplicável ao tipo de usuário, por exemplo, para Almoxarife Local e Profissional de Saúde)
- **Listagem de Usuários**: Exibe uma tabela com todos os usuários cadastrados, mostrando nome, email, tipo de usuário e unidade associada.
- **Edição de Usuários**: Permite editar os detalhes de um usuário existente, incluindo nome, email, tipo de usuário e a unidade hospitalar. A senha também pode ser redefinida.
- **Exclusão de Usuários**: Permite remover usuários do sistema.
- **Validação de Formulário**: Inclui validações básicas para os campos do formulário (por exemplo, email válido, senha mínima).
- **Mensagens de Feedback**: Exibe mensagens de sucesso, erro ou informação para as operações realizadas (cadastro, edição, exclusão de usuários).
- **Restrição de Acesso**: O acesso a esta página é **exclusivo** para usuários com `tipo_usuario` igual a `almoxarife_central`. Outros tipos de usuário são impedidos de acessar e recebem uma mensagem de erro.

## Papéis do Usuário e Permissões

- **`almoxarife_central`**:
  - É o único tipo de usuário com permissão para acessar e operar nesta página.
  - Pode criar, visualizar, editar e excluir qualquer usuário no sistema.
  - Pode atribuir qualquer `tipo_usuario` e `unidade_id` aos novos usuários ou usuários existentes.
- **Outros Papéis (`almoxarife_local`, `gestor`, `profissional_saude`)**:
  - São impedidos de acessar esta página e recebem uma mensagem de erro, indicando que não têm permissão.

## Busca de Dados

O componente interage com a API para buscar e manipular dados:

- `GET /usuarios`: Para obter a lista completa de usuários.
- `GET /unidades`: Para obter a lista de todas as unidades hospitalares, usada para preencher o dropdown de `unidade_id` ao cadastrar/editar usuários.
- `POST /usuarios`: Para cadastrar um novo usuário.
- `PUT /usuarios/:id`: Para atualizar as informações de um usuário existente.
- `DELETE /usuarios/:id`: Para excluir um usuário.

## Tecnologias Utilizadas

- **React**: Para a construção da interface do usuário.
- **React Icons (`react-icons`)**: Para ícones visuais (por exemplo, `FaUserPlus`, `FaUsers`, `FaEdit`, `FaTrash`, `FaCheckCircle`, `FaExclamationCircle`, `FaInfoCircle`).
- **Axios (`api` import)**: Para fazer requisições HTTP para a API de backend.
- **React Context (`useAuth`)**: Para acessar os dados do usuário autenticado (`user`), especificamente o `tipo_usuario` para controle de acesso.
- **Styled Components**: Para a estilização dos elementos do componente, importados de `../style/ConfiguracoesStyles`.

## Instalação

Assumindo que você tem um projeto React configurado:

1.  Coloque `Configuracoes.jsx` em seu diretório de componentes (ex: `src/components/Configuracoes`).
2.  Certifique-se de ter as dependências necessárias instaladas:
    ```bash
    npm install react react-icons styled-components axios
    # ou
    yarn add react react-icons styled-components axios
    ```
3.  Garanta que seus arquivos `api.js` e `AuthContext.js` estejam corretamente configurados e acessíveis.

## Uso

Importe e utilize o componente `Configuracoes` em sua aplicação, geralmente dentro de um sistema de roteamento que controle o acesso com base no perfil do usuário:

```jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Configuracoes from "./components/Configuracoes"; // Ajuste o caminho conforme necessário
import Login from "./components/Login"; // Exemplo
import Dashboard from "./components/Dashboard"; // Exemplo

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        {/* Outras rotas */}
      </Routes>
    </Router>
  );
}

export default App;
```
