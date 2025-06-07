# Componente de Gestão de Estoque (Estoque.jsx)

O componente `Estoque` é responsável por gerenciar o inventário de suprimentos dentro da aplicação. Ele permite que usuários autorizados (almoxarifes) registrem entradas e saídas de insumos, visualizem o estoque atual, filtrem e pesquisem lotes, e monitorem o status dos itens em estoque.

## Funcionalidades

- **Visão Geral do Estoque**: Exibe uma tabela detalhada de todos os lotes de insumos em estoque, incluindo nome do insumo, número do lote, quantidade atual, data de validade, unidade de medida, status (ativo, baixo, vencido) e local de armazenamento.
- **Registro de Entrada de Insumos**: Um formulário dedicado para adicionar novos insumos ao estoque, permitindo especificar o insumo, número do lote, data de validade, quantidade e unidade hospitalar de destino.
- **Registro de Saída de Insumos**: Um formulário para registrar a saída de insumos do estoque, exigindo a seleção do lote e a quantidade a ser removida.
- **Filtragem e Pesquisa**:
  - Campo de pesquisa para buscar lotes por nome do insumo ou número do lote.
  - Para `almoxarife_central`, há um filtro adicional para visualizar lotes por unidade hospitalar.
- **Atualização de Dados**: Um botão para atualizar manualmente a lista de lotes em estoque.
- **Indicadores de Status do Lote**: Os lotes são classificados visualmente com base em seu status:
  - **Vencido**: Se a data de validade já passou.
  - **Baixo**: Se a quantidade atual for inferior a 20 unidades.
  - **Ativo**: Para todos os outros casos.
- **Mensagens de Feedback**: Exibe mensagens de sucesso, erro ou informação para as operações realizadas (adição/remoção de insumos, erros de carregamento).
- **Restrição de Acesso**: O acesso a esta página é restrito a `almoxarife_local` e `almoxarife_central`. Usuários do tipo `gestor` são impedidos de acessar e recebem uma mensagem de erro.

## Papéis do Usuário e Permissões

- **`almoxarife_local`**:
  - Pode registrar entrada e saída de insumos apenas para sua própria unidade hospitalar, que é pré-selecionada e desabilitada nos formulários.
  - Visualiza apenas os lotes pertencentes à sua unidade.
- **`almoxarife_central`**:
  - Pode registrar entrada e saída de insumos para qualquer unidade hospitalar, selecionando a unidade nos formulários.
  - Pode visualizar lotes de todas as unidades ou filtrar por uma unidade específica na tabela de estoque.
- **`gestor`**:
  - Não tem permissão para acessar esta página e é redirecionado com uma mensagem de erro.
- **`profissional_saude`**: (Não explicitamente tratado no código para esta página, presume-se que não tenha acesso ou se enquadre nas restrições de `gestor` se o sistema for consistente).

## Busca de Dados

O componente interage com a API para buscar e manipular dados:

- `GET /insumos`: Para obter a lista completa de insumos para os dropdowns.
- `GET /unidades`: Para obter a lista de unidades hospitalares.
- `GET /lotes` ou `GET /lotes/:unidade_id`: Para buscar os lotes de insumos. O endpoint varia de acordo com o tipo de usuário e filtro de unidade selecionado.
- `POST /lotes/entrada`: Para registrar a entrada de novos lotes de insumos.
- `POST /lotes/saida`: Para registrar a saída de insumos de um lote existente.

## Tecnologias Utilizadas

- **React**: Para a construção da interface do usuário.
- **React Icons (`react-icons`)**: Para ícones visuais (por exemplo, `FaPlus`, `FaMinus`, `FaSearch`, `FaSyncAlt`, `FaInfoCircle`, `FaCheckCircle`, `FaExclamationCircle`).
- **`react-datepicker`**: Um componente para seleção de datas no formulário de entrada.
- **Styled Components**: Para a estilização dos elementos do componente, importados de `../style/EstoqueStyles`.
- **Axios (`api` import)**: Para fazer requisições HTTP para a API de backend.
- **React Context (`useAuth`)**: Para acessar os dados do usuário autenticado, como `user.tipo_usuario` e `user.unidade_id`.

## Instalação

Assumindo que você tem um projeto React configurado:

1.  Coloque `Estoque.jsx` em seu diretório de componentes (ex: `src/components/Estoque`).
2.  Certifique-se de ter as dependências necessárias instaladas:
    ```bash
    npm install react react-icons react-datepicker styled-components axios
    # ou
    yarn add react react-icons react-datepicker styled-components axios
    ```
3.  Garanta que seus arquivos `api.js` e `AuthContext.js` estejam corretamente configurados e acessíveis.
