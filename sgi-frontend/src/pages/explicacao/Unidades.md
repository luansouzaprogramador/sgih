# Componente de Gestão de Unidades Hospitalares (Unidades.jsx)

O componente `Unidades` é a página dedicada à administração das unidades hospitalares no sistema. Ele permite que usuários autorizados (especificamente o `almoxarife_central`) cadastrem novas unidades, visualizem as unidades existentes, editem suas informações e as excluam.

## Funcionalidades

- **Cadastro de Unidades**: Um formulário permite adicionar novas unidades hospitalares ao sistema, solicitando:
  - Nome da Unidade
  - Endereço
  - Telefone
  - Email
- **Listagem de Unidades**: Exibe uma tabela com todas as unidades hospitalares cadastradas, mostrando seus detalhes.
- **Edição de Unidades**: Permite editar os detalhes de uma unidade existente, como nome, endereço, telefone e email.
- **Exclusão de Unidades**: Permite remover unidades hospitalares do sistema.
- **Mensagens de Feedback**: Exibe mensagens de sucesso, erro ou informação para as operações realizadas (cadastro, edição, exclusão de unidades).
- **Restrição de Acesso**: O acesso a esta página é **exclusivo** para usuários com `tipo_usuario` igual a `almoxarife_central`. Outros tipos de usuário são impedidos de acessar e recebem uma mensagem de erro.

## Papéis do Usuário e Permissões

- **`almoxarife_central`**:
  - É o único tipo de usuário com permissão para acessar e operar nesta página.
  - Pode criar, visualizar, editar e excluir unidades hospitalares.
- **Outros Papéis (`almoxarife_local`, `gestor`, `profissional_saude`)**:
  - São impedidos de acessar esta página e recebem uma mensagem de erro.

## Busca de Dados

O componente interage com a API para buscar e manipular dados:

- `GET /unidades`: Para obter a lista completa de unidades hospitalares.
- `POST /unidades`: Para cadastrar uma nova unidade.
- `PUT /unidades/:id`: Para atualizar as informações de uma unidade existente.
- `DELETE /unidades/:id`: Para excluir uma unidade.

## Tecnologias Utilizadas

- **React**: Para a construção da interface do usuário.
- **React Icons (`react-icons`)**: Para ícones visuais (por exemplo, `FaPlus`, `FaEdit`, `FaTrash`, `FaHospital`, `FaCheckCircle`, `FaExclamationCircle`, `FaInfoCircle`).
- **Axios (`api` import)**: Para fazer requisições HTTP para a API de backend.
- **React Context (`useAuth`)**: Para acessar os dados do usuário autenticado (`user`), especificamente o `tipo_usuario` para controle de acesso.
- **Styled Components**: Para a estilização dos elementos do componente, importados de `../style/UnidadesStyles`.

## Instalação

Assumindo que você tem um projeto React configurado:

1.  Coloque `Unidades.jsx` em seu diretório de componentes (ex: `src/components/Unidades`).
2.  Certifique-se de ter as dependências necessárias instaladas:
    ```bash
    npm install react react-icons styled-components axios
    # ou
    yarn add react react-icons styled-components axios
    ```
3.  Garanta que seus arquivos `api.js` e `AuthContext.js` estejam corretamente configurados e acessíveis.

## Uso

Importe e utilize o componente `Unidades` em sua aplicação, geralmente dentro de um sistema de roteamento que controle o acesso com base no perfil do usuário:

```jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Unidades from "./components/Unidades"; // Ajuste o caminho conforme necessário
import Login from "./components/Login"; // Exemplo
import Dashboard from "./components/Dashboard"; // Exemplo

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/unidades" element={<Unidades />} />
        {/* Outras rotas */}
      </Routes>
    </Router>
  );
}

export default App;
```
