# Componente de Relatórios (Relatorios.jsx)

O componente `Relatorios` oferece aos usuários a capacidade de gerar e exportar diferentes tipos de relatórios relacionados ao estoque e movimentações de insumos. Ele suporta a visualização de relatórios de movimentações de estoque e de estoque crítico, com opções de filtragem e exportação para formatos comuns.

## Funcionalidades

- **Seleção de Tipo de Relatório**: Permite escolher entre "Movimentações de Estoque" e "Estoque Crítico".
- **Filtragem por Unidade Hospitalar**: Para o `almoxarife_central`, é possível filtrar os relatórios por uma unidade hospitalar específica ou visualizar dados de "Todas as Unidades". O `almoxarife_local` visualiza automaticamente os dados de sua própria unidade.
- **Filtragem por Período (Movimentações)**: Ao selecionar o relatório de "Movimentações de Estoque", campos de data de início e data de fim são exibidos para filtrar as movimentações dentro de um período específico.
- **Visualização de Dados**: Exibe os dados do relatório em uma tabela formatada, com colunas relevantes para cada tipo de relatório.
  - **Movimentações de Estoque**: Inclui ID, Data/Hora, Tipo (entrada, saída, transferência), Insumo, Lote, Quantidade, Origem/Destino e Responsável.
  - **Estoque Crítico**: Inclui Unidade, Insumo, Quantidade Atual e ID do Lote.
- **Exportação de Relatórios**: Permite exportar os dados exibidos na tabela para:
  - **CSV**: Arquivo de valores separados por vírgula.
  - **Excel (XLSX)**: Planilha eletrônica.
  - **PDF**: Funcionalidade ainda não implementada.
- **Mensagens de Feedback**: Exibe mensagens informativas se não houver dados para exibir ou para a funcionalidade de exportação não implementada.
- **Restrição de Acesso**: Acesso à página é permitido apenas para usuários com `tipo_usuario` `almoxarife_central` ou `almoxarife_local`. Outros tipos de usuário são impedidos de acessar e recebem uma mensagem de erro.

## Papéis do Usuário e Permissões

- **`almoxarife_central`**:
  - Pode gerar relatórios de movimentações e estoque crítico para todas as unidades ou para uma unidade específica.
- **`almoxarife_local`**:
  - Pode gerar relatórios de movimentações e estoque crítico, mas os dados são restritos à sua própria unidade hospitalar. O filtro de unidade é pré-selecionado para sua unidade.
- **Outros Papéis**:
  - Usuários que não são `almoxarife_central` ou `almoxarife_local` não têm permissão para acessar esta página e recebem uma mensagem de erro.

## Busca de Dados

O componente interage com a API para buscar dados dos relatórios:

- `GET /unidades`: Para obter a lista de todas as unidades hospitalares, usada para o filtro de unidade.
- `GET /movimentacoes` ou `GET /movimentacoes/:unidade_id`: Para buscar dados de movimentações de estoque. Pode incluir parâmetros de `data_inicio` e `data_fim`.
- `GET /alertas/estoque_critico` ou `GET /alertas/estoque_critico/:unidade_id`: Para buscar dados de estoque crítico.

## Tecnologias Utilizadas

- **React**: Para a construção da interface do usuário.
- **React Icons (`react-icons`)**: Para ícones visuais (por exemplo, `FaFilePdf`, `FaFileCsv`, `FaChartLine`, `FaExclamationCircle`).
- **Axios (`api` import)**: Para fazer requisições HTTP para a API de backend.
- **React Context (`useAuth`)**: Para acessar os dados do usuário autenticado (`user`), como `tipo_usuario` e `unidade_id`.
- **`xlsx`**: Biblioteca para leitura e escrita de arquivos Excel (XLSX).
- **Styled Components**: Para a estilização dos elementos do componente, importados de `../style/RelatoriosStyles` e `../style/ConfiguracoesStyles`.

## Instalação

Assumindo que você tem um projeto React configurado:

1.  Coloque `Relatorios.jsx` em seu diretório de componentes (ex: `src/components/Relatorios`).
2.  Certifique-se de ter as dependências necessárias instaladas:
    ```bash
    npm install react react-icons xlsx axios
    # ou
    yarn add react react-icons xlsx axios
    ```
3.  Garanta que seus arquivos `api.js` e `AuthContext.js` estejam corretamente configurados e acessíveis.
