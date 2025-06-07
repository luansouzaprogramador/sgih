# Componente de Agendamento de Entregas (Agendamentos.jsx)

O componente `Agendamentos` permite que usuários com o perfil de `almoxarife_central` gerenciem agendamentos de entrega de insumos entre diferentes unidades hospitalares. Ele oferece a funcionalidade de criar novos agendamentos e atualizar o status dos agendamentos existentes.

## Funcionalidades

- **Criação de Agendamentos**: Permite criar novos agendamentos de entrega, especificando:
  - **Unidade de Origem**: A unidade de onde os insumos serão enviados.
  - **Unidade de Destino**: A unidade que receberá os insumos.
  - **Data e Hora do Agendamento**: Um seletor de data e hora para definir o prazo da entrega.
  - **Observação**: Um campo opcional para adicionar notas relevantes ao agendamento.
  - **Itens do Agendamento**: Possibilidade de adicionar múltiplos itens a um agendamento, selecionando o lote do insumo e a quantidade a ser entregue.
- **Validação de Itens**: Antes de adicionar um item, verifica se o lote existe na unidade de origem, se a quantidade é positiva e se não excede o estoque disponível. Também impede a adição do mesmo lote múltiplas vezes.
- **Listagem de Agendamentos**: Exibe uma tabela com todos os agendamentos, mostrando ID, unidades de origem e destino, data/hora, itens agendados, status e responsável.
- **Atualização de Status**: Permite que o `almoxarife_central` altere o status de um agendamento entre "Pendente", "Em Trânsito", "Concluído" e "Cancelado".
- **Restrição de Acesso**: O acesso a esta página é exclusivo para usuários com `tipo_usuario` igual a `almoxarife_central`. Outros tipos de usuário são redirecionados para o dashboard ou página de login.
- **Mensagens de Feedback**: Exibe mensagens de sucesso ou erro para as operações de agendamento e atualização.
- **Carregamento de Dados**: Apresenta um estado de carregamento enquanto os dados iniciais (unidades, insumos, lotes e agendamentos) estão sendo buscados.

## Papéis do Usuário e Permissões

- **`almoxarife_central`**:
  - É o único tipo de usuário com permissão para acessar e operar nesta página.
  - Pode criar agendamentos entre quaisquer unidades disponíveis.
  - Pode atualizar o status de qualquer agendamento.
- **Outros Papéis (`almoxarife_local`, `gestor`, `profissional_saude`)**:
  - São redirecionados para a página `/dashboard` ou `/login` se tentarem acessar esta página.

## Busca de Dados

O componente interage com a API para buscar e manipular dados:

- `GET /unidades`: Para obter a lista de todas as unidades hospitalares.
- `GET /insumos`: Para obter a lista de todos os insumos.
- `GET /lotes/:unidade_id`: Para buscar os lotes de insumos disponíveis em uma unidade específica. Isso é feito para todas as unidades quando a página é carregada.
- `GET /agendamentos`: Para buscar todos os agendamentos existentes.
- `POST /agendamentos`: Para criar um novo agendamento de entrega.
- `PUT /agendamentos/:scheduleId/status`: Para atualizar o status de um agendamento específico.

## Tecnologias Utilizadas

- **React**: Para a construção da interface do usuário.
- **React Router (`react-router-dom`)**: Para gerenciamento de navegação e redirecionamento (`useNavigate`).
- **React Icons (`react-icons`)**: Para ícones visuais (por exemplo, `FaPlus`, `FaCheckCircle`, `FaTruck`, `FaCalendarAlt`, `FaExchangeAlt`, `FaExclamationCircle`).
- **`react-datepicker`**: Um componente para seleção de datas e horas.
- **Axios (`api` import)**: Para fazer requisições HTTP para a API de backend.
- **React Context (`useAuth`)**: Para acessar os dados do usuário autenticado (`user`) e a função de `logout`.
- **Styled Components**: Para a estilização dos elementos do componente, importados de `../style/AgendamentosStyles`.

## Instalação

Assumindo que você tem um projeto React configurado:

1.  Coloque `Agendamentos.jsx` em seu diretório de componentes (ex: `src/components/Agendamentos`).
2.  Certifique-se de ter as dependências necessárias instaladas:
    ```bash
    npm install react react-router-dom react-icons react-datepicker styled-components axios
    # ou
    yarn add react react-router-dom react-icons react-datepicker styled-components axios
    ```
3.  Garanta que seus arquivos `api.js` e `AuthContext.js` estejam corretamente configurados e acessíveis.
