# Sistema de Gestão de Estoque Hospitalar

Este é um sistema abrangente para a gestão de insumos e processos logísticos em ambientes hospitalares, otimizando o controle de estoque, movimentações, agendamentos de entrega e a administração de usuários e unidades.

## Visão Geral do Sistema

O sistema é dividido em módulos, cada um com funcionalidades específicas e controle de acesso baseado no perfil do usuário, garantindo que cada função tenha as permissões necessárias para suas operações.

### Módulos Principais

1.  **Dashboard**
2.  **Estoque**
3.  **Agendamentos**
4.  **Relatórios**
5.  **Insumos**
6.  **Unidades**
7.  **Configurações (Usuários)**

---

## 1. Dashboard (`Dashboard.jsx`)

O Dashboard é a **página inicial** do sistema, fornecendo uma visão geral rápida e personalizada para o usuário logado.

### Funcionalidades:

- **Boas-vindas Personalizada**: Mensagem de boas-vindas ao usuário.
- **Estatísticas Chave**:
  - Total de Insumos cadastrados.
  - Número de Entregas Pendentes (visível apenas para `almoxarife_central`).
  - Contagem de Alertas de Estoque Crítico.
- **Alertas Ativos**: Lista de alertas recentes, como insumos vencidos ou com estoque baixo.
- **Últimas Movimentações**: Tabela com as movimentações de estoque mais recentes (entradas, saídas, transferências).

### Permissões:

- Conteúdo dinâmico com base no `tipo_usuario` (`almoxarife_local`, `almoxarife_central`, `gestor`, `profissional_saude`).
- `almoxarife_local` e `almoxarife_central` têm acesso a estatísticas detalhadas e movimentações.
- `gestor` e `profissional_saude` veem uma mensagem de "Funcionalidade em desenvolvimento" nesta seção.

---

## 2. Estoque (`Estoque.jsx`)

A página de Estoque é o coração do sistema para o controle de inventário, permitindo a gestão detalhada dos lotes de insumos.

### Funcionalidades:

- **Registro de Entrada**: Adição de novos lotes de insumos ao estoque, com detalhes como nome, lote, validade, quantidade e unidade.
- **Registro de Saída**: Remoção de quantidades de insumos de lotes existentes.
- **Visualização Detalhada**: Tabela de todos os lotes em estoque, com informações de insumo, lote, quantidade, validade, unidade de medida, status (ativo, baixo, vencido) e local de armazenamento.
- **Filtragem e Pesquisa**:
  - Busca por nome de insumo ou número de lote.
  - Filtro por Unidade Hospitalar (para `almoxarife_central`).
- **Status Visual de Lotes**: Indicadores visuais para alertar sobre lotes com estoque baixo ou vencidos.

### Permissões:

- **`almoxarife_local`**: Gerencia estoque apenas de sua unidade, com unidade pré-selecionada.
- **`almoxarife_central`**: Gerencia estoque de qualquer unidade, podendo filtrar e selecionar unidades.
- **Outros Papéis (`gestor`, `profissional_saude`)**: Não têm acesso a esta página.

---

## 3. Agendamentos (`Agendamentos.jsx`)

O módulo de Agendamentos é crucial para a logística e controle de transferências de insumos entre as unidades.

### Funcionalidades:

- **Criação de Agendamentos de Entrega**: Permite agendar a entrega de insumos entre uma unidade de origem e uma de destino, com data, hora, observações e listagem de itens por lote e quantidade.
- **Validação de Estoque**: Verifica a disponibilidade do lote na unidade de origem antes de permitir o agendamento.
- **Listagem de Agendamentos**: Tabela com todos os agendamentos, seus itens, status e responsável.
- **Atualização de Status**: Possibilidade de alterar o status do agendamento (Pendente, Em Trânsito, Concluído, Cancelado).

### Permissões:

- **`almoxarife_central`**: É o único papel com acesso a esta página, podendo criar e gerenciar agendamentos para todas as unidades.
- **Outros Papéis**: Não têm acesso a esta página.

---

## 4. Relatórios (`Relatorios.jsx`)

A página de Relatórios oferece ferramentas para extrair e analisar dados importantes do sistema.

### Funcionalidades:

- **Tipos de Relatórios**:
  - **Movimentações de Estoque**: Detalha todas as entradas, saídas e transferências de insumos em um período específico.
  - **Estoque Crítico**: Lista os insumos com quantidades abaixo do limite de segurança.
- **Filtros Flexíveis**:
  - Por período de datas (para movimentações).
  - Por Unidade Hospitalar (para `almoxarife_central`, ou pré-selecionado para `almoxarife_local`).
- **Visualização em Tabela**: Apresenta os dados de forma clara e organizada.
- **Exportação**: Permite exportar os relatórios para **CSV** e **Excel (XLSX)**. A exportação para PDF está planejada para futuras versões.

### Permissões:

- **`almoxarife_central`**: Pode gerar relatórios para todas as unidades ou para uma unidade específica.
- **`almoxarife_local`**: Pode gerar relatórios, mas apenas para sua unidade.
- **Outros Papéis**: Não têm acesso a esta página.

---

## 5. Insumos (`Insumos.jsx`)

O módulo de Insumos permite a gestão dos itens que compõem o inventário hospitalar.

### Funcionalidades:

- **Cadastro de Insumos**: Adição de novos tipos de insumos ao sistema com nome, descrição, unidade de medida e local de armazenamento.
- **Visualização, Edição e Exclusão**: Gerenciamento completo dos insumos cadastrados.
- **Solicitação de Insumos**: Uma funcionalidade específica para `profissional_saude` solicitar insumos, escolhendo o insumo e a quantidade.

### Permissões:

- **`almoxarife_central` e `almoxarife_local`**: Podem cadastrar, visualizar, editar e excluir insumos.
- **`profissional_saude`**: Pode visualizar a lista de insumos e fazer solicitações. Não pode cadastrar, editar ou excluir.
- **`gestor`**: Não tem acesso a esta página.

---

## 6. Unidades (`Unidades.jsx`)

A página de Unidades é para a administração das diferentes unidades hospitalares que o sistema gerencia.

### Funcionalidades:

- **Cadastro de Unidades**: Registro de novas unidades hospitalares com nome, endereço, telefone e e-mail.
- **Listagem de Unidades**: Visualização de todas as unidades cadastradas.
- **Edição e Exclusão**: Funcionalidades para atualizar ou remover unidades do sistema.

### Permissões:

- **`almoxarife_central`**: É o único perfil com permissão para acessar e gerenciar as unidades hospitalares.
- **Outros Papéis**: Não têm acesso a esta página.

---

## 7. Configurações (`Configuracoes.jsx`)

O módulo de Configurações é o painel de administração de usuários do sistema.

### Funcionalidades:

- **Cadastro de Usuários**: Criação de novas contas de usuário com nome, e-mail, senha, tipo de usuário (Gestor, Almoxarife Local, Almoxarife Central, Profissional de Saúde) e associação a uma unidade hospitalar.
- **Listagem de Usuários**: Visão geral de todos os usuários cadastrados e seus detalhes.
- **Edição de Usuários**: Permite atualizar informações de usuários existentes, incluindo redefinição de senha e alteração do tipo de usuário ou unidade associada.
- **Exclusão de Usuários**: Remoção de contas de usuário.

### Permissões:

- **`almoxarife_central`**: É o único perfil com permissão para acessar e gerenciar usuários.
- **Outros Papéis**: Não têm acesso a esta página.

---

## Tecnologias Utilizadas

Este sistema é construído utilizando as seguintes tecnologias principais no frontend:

- **React**: Biblioteca JavaScript para construção da interface do usuário.
- **React Router (`react-router-dom`)**: Para o roteamento e navegação entre as páginas.
- **React Context**: Para gerenciamento de estado global, como autenticação de usuário (`AuthContext`).
- **Axios**: Cliente HTTP para comunicação com a API de backend.
- **Styled Components**: Para a estilização dos componentes, garantindo um design modular e reutilizável.
- **React Icons (`react-icons`)**: Para uma vasta biblioteca de ícones visuais.
- **`react-datepicker`**: Para seleção de datas em formulários.
- **`xlsx`**: Para funcionalidades de exportação de dados para Excel.

## Comunicação com a API (`api.js`)

O arquivo `api.js` é o ponto central para todas as requisições HTTP do frontend para o backend, utilizando a biblioteca Axios. Ele é configurado para:

- **URL Base**: Define o `baseURL` para todas as requisições, obtendo-o de uma variável de ambiente (`import.meta.env.VITE_API_BASE_URL`), o que facilita a configuração em diferentes ambientes (desenvolvimento, produção).
- **Headers Padrão**: Garante que todas as requisições enviem o `Content-Type: application/json`.
- **Interceptor de Requisição**: Automaticamente injeta o token de autenticação (`Bearer <token>`) no cabeçalho `Authorization` de cada requisição, se o token estiver presente no `localStorage`. Isso garante que as requisições autenticadas sejam enviadas corretamente.
- **Interceptor de Resposta**: Lida com erros de resposta, especificamente `401 Unauthorized` e `403 Forbidden`. Nesses casos, o interceptor remove o token e os dados do usuário do `localStorage` e redireciona o usuário para a página de login (`/login`), garantindo que a sessão seja encerrada de forma segura e que o usuário seja forçado a reautenticar-se se sua sessão expirar ou for inválida.

## Instalação e Execução

Para configurar e executar o projeto localmente:

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO>
    cd <NOME_DO_SEU_PROJETO>
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```
3.  **Configuração da API:**
    Crie um arquivo `.env` na raiz do projeto e defina a variável de ambiente `VITE_API_BASE_URL` com o URL da sua API de backend.
    ```
    VITE_API_BASE_URL=http://localhost:3001/api # Exemplo
    ```
4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm start
    # ou
    yarn start
    ```
    O aplicativo será aberto no seu navegador padrão em `http://localhost:3000` (ou outra porta disponível).
