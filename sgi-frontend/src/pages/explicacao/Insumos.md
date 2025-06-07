# Componente de Gestão de Insumos (Insumos.jsx)

O componente `Insumos` é a página central para a gestão de insumos dentro do sistema. Ele permite que usuários autorizados cadastrem novos insumos, visualizem a lista de insumos existentes, editem suas informações e os excluam. Além disso, ele oferece a funcionalidade para profissionais de saúde solicitarem insumos.

## Funcionalidades

- **Cadastro de Insumos**: Um formulário permite adicionar novos insumos ao sistema, solicitando:
  - Nome
  - Descrição
  - Unidade de Medida (por exemplo, "caixa", "unidade", "litro")
  - Local de Armazenamento
- **Listagem de Insumos**: Exibe uma tabela com todos os insumos cadastrados, mostrando suas informações básicas.
- **Edição de Insumos**: Permite editar os detalhes de um insumo existente.
- **Exclusão de Insumos**: Permite remover insumos do sistema.
- **Solicitação de Insumos (para `profissional_saude`)**:
  - Uma seção específica é exibida para usuários do tipo `profissional_saude`.
  - Permite que o profissional selecione um insumo e a quantidade desejada para fazer uma solicitação.
- **Mensagens de Feedback**: Exibe mensagens de sucesso, erro ou informação para as operações realizadas (cadastro, edição, exclusão, solicitação de insumos).
- **Restrição de Acesso**: As funcionalidades de cadastro, edição e exclusão de insumos são visíveis apenas para `almoxarife_central` e `almoxarife_local`. A funcionalidade de solicitação é exclusiva para `profissional_saude`. Usuários do tipo `gestor` não têm permissão para acessar esta página e recebem uma mensagem de erro.

## Papéis do Usuário e Permissões

- **`almoxarife_central` e `almoxarife_local`**:
  - Podem criar, visualizar, editar e excluir insumos.
  - A unidade hospitalar para o cadastro é pré-preenchida para `almoxarife_local` com a unidade dele e pode ser selecionada para `almoxarife_central`.
- **`profissional_saude`**:
  - Pode visualizar a lista de insumos, mas não pode cadastrar, editar ou excluir.
  - Tem acesso à seção de solicitação de insumos.
- **`gestor`**:
  - Não tem permissão para acessar esta página e é redirecionado com uma mensagem de erro.

## Busca de Dados

O componente interage com a API para buscar e manipular dados:

- `GET /insumos`: Para obter a lista completa de insumos.
- `POST /insumos`: Para cadastrar um novo insumo.
- `PUT /insumos/:id`: Para atualizar as informações de um insumo existente.
- `DELETE /insumos/:id`: Para excluir um insumo.
- `GET /unidades`: Para obter a lista de unidades hospitalares, usada para o campo de unidade no formulário de insumos (se aplicável ao papel do usuário).
- `POST /solicitacoes`: Para registrar uma solicitação de insumo feita por um `profissional_saude`.

## Tecnologias Utilizadas

- **React**: Para a construção da interface do usuário.
- **React Icons (`react-icons`)**: Para ícones visuais (por exemplo, `FaPlus`, `FaEdit`, `FaTrash`, `FaCheckCircle`, `FaExclamationCircle`, `FaInfoCircle`, `FaClipboardList`, `FaBoxOpen`).
- **Axios (`api` import)**: Para fazer requisições HTTP para a API de backend.
- **React Context (`useAuth`)**: Para acessar os dados do usuário autenticado (`user`), como `tipo_usuario` e `unidade_id`.
- **Styled Components**: Para a estilização dos elementos do componente, importados de `../style/InsumosStyles`.

## Instalação

Assumindo que você tem um projeto React configurado:

1.  Coloque `Insumos.jsx` em seu diretório de componentes (ex: `src/components/Insumos`).
2.  Certifique-se de ter as dependências necessárias instaladas:
    ```bash
    npm install react react-icons styled-components axios
    # ou
    yarn add react react-icons styled-components axios
    ```
3.  Garanta que seus arquivos `api.js` e `AuthContext.js` estejam corretamente configurados e acessíveis.
