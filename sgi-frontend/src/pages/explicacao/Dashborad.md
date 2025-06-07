# Componente Dashboard

O componente `Dashboard` é a página de destino central para os usuários ao fazer login no aplicativo. Ele fornece uma visão geral das informações chave relevantes para o papel do usuário, como estatísticas de estoque, entregas pendentes, alertas de estoque crítico e movimentações recentes de inventário.

## Funcionalidades

- **Exibição de Conteúdo Baseada em Função**: O painel ajusta dinamicamente seu conteúdo com base no `tipo_usuario` (tipo de usuário) do usuário logado.
- **Mensagem de Boas-vindas**: Exibe uma mensagem de boas-vindas personalizada para o usuário logado.
- **Visão Geral das Estatísticas Chave**:
  - **Total de Insumos**: Mostra o número total de diferentes suprimentos disponíveis.
  - **Entregas Pendentes**: (Visível apenas para `almoxarife_central`) Exibe a contagem de entregas de suprimentos pendentes.
  - **Alertas de Estoque Crítico**: Mostra o número de alertas ativos para suprimentos com estoque criticamente baixo.
- **Lista de Alertas Ativos**: Exibe uma lista de alertas recentes, incluindo alertas de vencimento e alertas de estoque crítico, com detalhes como tipo, mensagem, nome do suprimento e número do lote.
- **Tabela de Movimentações Recentes**: Mostra uma tabela das movimentações de inventário mais recentes (entradas, saídas ou transferências) com detalhes como data/hora, tipo, suprimento, lote, quantidade e pessoa responsável.
- **Tratamento de Carregamento e Erros**: Fornece feedback visual durante o carregamento de dados e exibe mensagens de erro se a busca de dados falhar.

## Papéis do Usuário e suas Telas de Dashboard

O conteúdo do painel é adaptado para os seguintes tipos de usuário:

### `almoxarife_local` (Almoxarife Local) e `almoxarife_central` (Almoxarife Central)

Esses papéis têm acesso a um conjunto completo de funcionalidades de gerenciamento de inventário no painel, incluindo:

- **Visão Geral**:
  - Total de Insumos
  - Entregas Pendentes (apenas para `almoxarife_central`)
  - Alertas de Estoque Crítico
- **Alertas Ativos**: Lista todos os alertas ativos relevantes para seu escopo (unidade local para `almoxarife_local`, todas as unidades para `almoxarife_central`).
- **Últimas Movimentações**: Exibe movimentações recentes de inventário (específicas para sua unidade para `almoxarife_local`, todas as movimentações para `almoxarife_central`).

### `gestor` (Gerente) e `profissional_saude` (Profissional de Saúde)

Para esses papéis, o painel atualmente exibe uma mensagem de espaço reservado para uma "Funcionalidade em desenvolvimento" referente a alertas de solicitação de suprimentos. As estatísticas detalhadas de inventário e as movimentações não são visíveis para esses tipos de usuário no painel.

## Busca de Dados

O componente busca dados dos seguintes endpoints da API com base no papel do usuário:

- `/insumos`: Para obter o número total de suprimentos.
- `/agendamentos/`: Para obter entregas pendentes (apenas para `almoxarife_central`).
- `/alertas/` ou `/alertas/:unidade_id`: Para buscar alertas (todos os alertas para `almoxarife_central`, alertas específicos da unidade para `almoxarife_local`).
- `/movimentacoes/` ou `/movimentacoes/:unidade_id?periodo=30`: Para buscar movimentações recentes (todas as movimentações para `almoxarife_central`, movimentações específicas da unidade para `almoxarife_local`, limitado aos últimos 30 dias).

## Tecnologias Utilizadas

- **React**: Para construir a interface do usuário.
- **React Icons (`react-icons`)**: Para exibir vários ícones (por exemplo, `FaWarehouse`, `FaCalendarCheck`, `FaExclamationTriangle`, `FaArrowRight`, `FaArrowLeft`).
- **Styled Components**: Usado para estilizar os elementos do painel, importados de `../style/DashboardStyles`.
- **Axios (`api` import)**: Para fazer requisições HTTP para a API de backend.
- **React Context (`useAuth`)**: Para acessar os detalhes de autenticação do usuário, especificamente o objeto `user` contendo `tipo_usuario` e `unidade_id`.

## Instalação

Assumindo que você tem um projeto React configurado:

1.  Coloque `Dashboard.jsx` em seu diretório de componentes (por exemplo, `src/components/Dashboard`).
2.  Certifique-se de ter as dependências necessárias instaladas:
    ```bash
    npm install react react-icons styled-components axios
    # ou
    yarn add react react-icons styled-components axios
    ```
3.  Certifique-se de que seus arquivos `api.js` e `AuthContext.js` estejam corretamente configurados e acessíveis.
