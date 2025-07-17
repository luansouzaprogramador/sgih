const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const moment = require('moment'); // Para comparações de data
const { checkAndCreateAlerts } = require('../utils/alertService'); // Importar o alertService

const router = express.Router();

// Constante para o ID da unidade central (agora uma unidade própria)
const CENTRAL_UNIT_ID = 5; // ID da nova unidade 'Almoxarifado Central FHEMIG'

// Endpoint para submeter solicitações de insumo (Profissional de Saúde/Gestor para Almoxarife Local)
router.post('/', authenticateToken, authorizeRoles(['gestor', 'profissional_saude']), async (req, res) => {
  const { insumo_id, quantidade } = req.body;
  const solicitante_id = req.user.userId;

  if (!insumo_id || !quantidade) {
    return res.status(400).json({ message: 'Insumo ID e quantidade são obrigatórios.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO solicitacoes_insumo (insumo_id, quantidade, solicitante_id, tipo_solicitacao) VALUES (?, ?, ?, ?)',
      [insumo_id, quantidade, solicitante_id, 'local'] // Tipo de solicitação 'local'
    );
    res.status(201).json({ message: 'Solicitação de insumo registrada com sucesso!', solicitacaoId: result.insertId });
  } catch (error) {
    console.error('Erro ao registrar solicitação de insumo:', error);
    res.status(500).json({ message: 'Erro no servidor ao registrar solicitação de insumo.' });
  }
});

// NOVA ROTA: Endpoint para almoxarife local submeter solicitações ao almoxarife central
router.post('/solicitar-central', authenticateToken, authorizeRoles(['almoxarife_local']), async (req, res) => {
  const { insumo_id, quantidade } = req.body;
  const solicitante_id = req.user.userId; // ID do almoxarife local

  if (!insumo_id || !quantidade) {
    return res.status(400).json({ message: 'Insumo ID e quantidade são obrigatórios.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO solicitacoes_insumo (insumo_id, quantidade, solicitante_id, tipo_solicitacao) VALUES (?, ?, ?, ?)',
      [insumo_id, quantidade, solicitante_id, 'central'] // Tipo de solicitação 'central'
    );
    res.status(201).json({ message: 'Solicitação de insumo para o almoxarife central registrada com sucesso!', solicitacaoId: result.insertId });
  } catch (error) {
    console.error('Erro ao registrar solicitação de insumo para o almoxarife central:', error);
    res.status(500).json({ message: 'Erro no servidor ao registrar solicitação de insumo para o almoxarife central.' });
  }
});


// Obter todas as solicitações de insumo com filtragem baseada na função do usuário e status
router.get('/', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local', 'gestor', 'profissional_saude']), async (req, res) => {
  const userRole = req.user.tipo_usuario;
  const userId = req.user.userId;
  const userUnidadeId = req.user.unidade_id; // Agora será o ID da unidade central para almoxarife_central
  const { status } = req.query; // Obter filtro de status dos parâmetros de consulta

  try {
    let query = `
      SELECT
        si.id,
        si.quantidade,
        si.status,
        si.data_solicitacao,
        si.data_atualizacao,
        i.nome AS insumo_nome,
        i.unidade_medida,
        u.nome AS solicitante_nome,
        uh.nome AS unidade_solicitante_nome,
        uh.id AS unidade_solicitante_id,
        si.tipo_solicitacao
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      JOIN usuarios u ON si.solicitante_id = u.id
      JOIN unidades_hospitalares uh ON u.unidade_id = uh.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'gestor' || userRole === 'profissional_saude') {
      // Gestor e profissional_saude veem apenas suas próprias solicitações (tipo 'local')
      query += ' AND si.solicitante_id = ? AND si.tipo_solicitacao = "local"';
      params.push(userId);
    } else if (userRole === 'almoxarife_local') {
      // Almoxarife_local vê solicitações de sua própria unidade (tipo 'local')
      query += ' AND uh.id = ? AND si.tipo_solicitacao = "local"';
      params.push(userUnidadeId);
    }
    // Almoxarife_central obtém todas as solicitações (sem cláusula WHERE adicional baseada em unidade/usuário)
    // A rota para almoxarifes centrais verem solicitações de almoxarifes locais será separada.

    // Adiciona filtro de status se fornecido
    if (status) {
      query += ' AND si.status = ?';
      params.push(status);
    }

    query += ' ORDER BY si.data_solicitacao DESC';

    const [rows] = await pool.execute(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao carregar solicitações de insumo:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar solicitações de insumo.' });
  }
});


// NOVA ROTA: Obter solicitações de almoxarifes locais (para almoxarife central)
router.get('/almoxarifes-locais', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { status } = req.query;

  try {
    let query = `
      SELECT
        si.id,
        si.quantidade,
        si.status,
        si.data_solicitacao,
        si.data_atualizacao,
        i.nome AS insumo_nome,
        i.unidade_medida,
        u.nome AS solicitante_nome,
        uh.nome AS unidade_solicitante_nome,
        uh.id AS unidade_solicitante_id,
        si.tipo_solicitacao
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      JOIN usuarios u ON si.solicitante_id = u.id
      JOIN unidades_hospitalares uh ON u.unidade_id = uh.id
      WHERE si.tipo_solicitacao = 'central'
    `;
    const params = [];

    if (status) {
      query += ' AND si.status = ?';
      params.push(status);
    }

    query += ' ORDER BY si.data_solicitacao DESC';

    const [rows] = await pool.execute(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao carregar solicitações de almoxarifes locais:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar solicitações de almoxarifes locais.' });
  }
});

// NOVA ROTA: Obter MINHAS solicitações (almoxarife local para central)
router.get('/minhas-solicitacoes-central', authenticateToken, authorizeRoles(['almoxarife_local']), async (req, res) => {
  const userId = req.user.userId;
  const { status } = req.query;

  try {
    let query = `
      SELECT
        si.id,
        si.quantidade,
        si.status,
        si.data_solicitacao,
        si.data_atualizacao,
        i.nome AS insumo_nome,
        i.unidade_medida,
        u.nome AS solicitante_nome,
        uh.nome AS unidade_solicitante_nome,
        uh.id AS unidade_solicitante_id,
        si.tipo_solicitacao
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      JOIN usuarios u ON si.solicitante_id = u.id
      JOIN unidades_hospitalares uh ON u.unidade_id = uh.id
      WHERE si.solicitante_id = ? AND si.tipo_solicitacao = 'central'
    `;
    const params = [userId];

    if (status) {
      query += ' AND si.status = ?';
      params.push(status);
    }

    query += ' ORDER BY si.data_solicitacao DESC';

    const [rows] = await pool.execute(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao carregar minhas solicitações para o almoxarife central:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar minhas solicitações para o almoxarife central.' });
  }
});


// Rota para rejeitar uma solicitação (Profissional de Saúde/Gestor para Almoxarife Local)
router.put('/:id/status', authenticateToken, authorizeRoles(['almoxarife_local']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Valor esperado: 'rejeitada'
  const almoxarifeUnidadeId = req.user.unidade_id;

  if (status !== 'rejeitada') {
    return res.status(400).json({ message: 'Status inválido para esta rota. Apenas "rejeitada" é permitido.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verificar se a solicitação é do tipo 'local' e pertence à unidade do almoxarife
    const [solicitacaoRows] = await connection.execute(
      `SELECT si.id, u.unidade_id AS unidade_solicitante_id, si.tipo_solicitacao
       FROM solicitacoes_insumo si
       JOIN usuarios u ON si.solicitante_id = u.id
       WHERE si.id = ?`,
      [id]
    );

    const solicitacao = solicitacaoRows[0];
    if (!solicitacao || solicitacao.tipo_solicitacao !== 'local' || solicitacao.unidade_solicitante_id !== almoxarifeUnidadeId) {
      await connection.rollback();
      return res.status(403).json({ message: 'Acesso negado: Esta solicitação não pode ser rejeitada por este almoxarife local.' });
    }

    const [result] = await connection.execute(
      'UPDATE solicitacoes_insumo SET status = ?, data_atualizacao = NOW() WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    await connection.commit();
    res.json({ message: `Status da solicitação ${id} atualizado para ${status} com sucesso.` });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erro ao atualizar status da solicitação:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar status da solicitação.' });
  } finally {
    if (connection) connection.release();
  }
});

// Rota para aprovar uma solicitação e deduzir estoque (Profissional de Saúde/Gestor para Almoxarife Local)
router.put('/:id/aprovar', authenticateToken, authorizeRoles(['almoxarife_local']), async (req, res) => {
  const solicitacaoId = req.params.id;
  const responsavel_id = req.user.userId;
  const almoxarifeUnidadeId = req.user.unidade_id;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Buscar detalhes da solicitação
    const [solicitacaoRows] = await connection.execute(
      `SELECT si.id, si.insumo_id, si.quantidade, u.unidade_id AS unidade_solicitante_id, si.status, si.tipo_solicitacao
       FROM solicitacoes_insumo si
       JOIN usuarios u ON si.solicitante_id = u.id
       WHERE si.id = ?`,
      [solicitacaoId]
    );

    const solicitacao = solicitacaoRows[0];

    if (!solicitacao) {
      await connection.rollback();
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    if (solicitacao.status !== 'pendente') {
      await connection.rollback();
      return res.status(400).json({ message: `Solicitação já foi ${solicitacao.status}.` });
    }

    // Apenas almoxarife local pode aprovar solicitações do tipo 'local' para sua unidade
    if (solicitacao.tipo_solicitacao !== 'local' || solicitacao.unidade_solicitante_id !== almoxarifeUnidadeId) {
      await connection.rollback();
      return res.status(403).json({ message: 'Acesso negado: Esta solicitação não pode ser aprovada por este almoxarife local.' });
    }

    const { insumo_id, quantidade: quantidadeSolicitada, unidade_solicitante_id } = solicitacao;

    // 3. Encontrar lotes ativos adequados para insumo_id na unidade_solicitante_id
    const [lotesDisponiveis] = await connection.execute(
      `SELECT id, quantidade_atual, data_validade
       FROM lotes
       WHERE insumo_id = ? AND unidade_id = ? AND quantidade_atual > 0 AND status = 'ativo'
       ORDER BY data_validade ASC`,
      [insumo_id, unidade_solicitante_id]
    );

    let quantidadeRestante = quantidadeSolicitada;
    const movimentacoesParaRegistrar = [];

    for (const lote of lotesDisponiveis) {
      if (moment(lote.data_validade).startOf('day').isBefore(moment().startOf('day'))) {
        continue;
      }

      if (quantidadeRestante <= 0) break;

      const quantidadeDoLote = lote.quantidade_atual;
      const quantidadeATirar = Math.min(quantidadeRestante, quantidadeDoLote);

      const novaQuantidadeLote = quantidadeDoLote - quantidadeATirar;
      await connection.execute(
        'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
        [novaQuantidadeLote, lote.id]
      );

      movimentacoesParaRegistrar.push({
        lote_id: lote.id,
        quantidade: quantidadeATirar,
      });

      quantidadeRestante -= quantidadeATirar;
    }

    if (quantidadeRestante > 0) {
      await connection.rollback();
      return res.status(400).json({ message: `Quantidade insuficiente em estoque local para o insumo solicitado. Faltam ${quantidadeRestante} unidades.` });
    }

    // 4. Inserir movimentação(ões)
    for (const mov of movimentacoesParaRegistrar) {
      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
        [mov.lote_id, 'saida', mov.quantidade, responsavel_id, unidade_solicitante_id]
      );
    }

    // 5. Atualizar status de solicitacoes_insumo para 'aprovada'
    await connection.execute(
      'UPDATE solicitacoes_insumo SET status = ?, data_atualizacao = NOW() WHERE id = ?',
      ['aprovada', solicitacaoId]
    );

    await connection.commit();
    res.json({ message: 'Solicitação aprovada e estoque local atualizado com sucesso!' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erro ao aprovar solicitação e dar baixa no estoque local:', error);
    res.status(500).json({ message: 'Erro no servidor ao processar aprovação da solicitação.' });
  } finally {
    if (connection) connection.release();
  }
});


// NOVA ROTA: Rota para almoxarife central aprovar solicitações de almoxarifes locais
router.put('/almoxarifes-locais/:id/aprovar', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const solicitacaoId = req.params.id;
  const responsavel_id = req.user.userId;
  const almoxarifeCentralUnidadeId = req.user.unidade_id; // Agora é o ID da unidade central do usuário logado

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Buscar detalhes da solicitação
    const [solicitacaoRows] = await connection.execute(
      `SELECT si.id, si.insumo_id, si.quantidade, u.unidade_id AS unidade_solicitante_id, si.status, si.tipo_solicitacao
       FROM solicitacoes_insumo si
       JOIN usuarios u ON si.solicitante_id = u.id
       WHERE si.id = ?`,
      [solicitacaoId]
    );

    const solicitacao = solicitacaoRows[0];

    if (!solicitacao) {
      await connection.rollback();
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    if (solicitacao.status !== 'pendente') {
      await connection.rollback();
      return res.status(400).json({ message: `Solicitação já foi ${solicitacao.status}.` });
    }

    // Apenas almoxarife central pode aprovar solicitações do tipo 'central'
    if (solicitacao.tipo_solicitacao !== 'central') {
      await connection.rollback();
      return res.status(403).json({ message: 'Acesso negado: Esta solicitação não é para o almoxarifado central.' });
    }

    const { insumo_id, quantidade: quantidadeSolicitada, unidade_solicitante_id } = solicitacao;

    // 3. Encontrar lotes ativos adequados para insumo_id na unidade CENTRAL (req.user.unidade_id)
    const [lotesDisponiveis] = await connection.execute(
      `SELECT id, quantidade_atual, data_validade, numero_lote
       FROM lotes
       WHERE insumo_id = ? AND unidade_id = ? AND quantidade_atual > 0 AND status = 'ativo'
       ORDER BY data_validade ASC`,
      [insumo_id, almoxarifeCentralUnidadeId] // Busca no estoque do almoxarife central (sua própria unidade_id)
    );

    let quantidadeRestante = quantidadeSolicitada;
    const movimentacoesParaRegistrar = [];

    for (const lote of lotesDisponiveis) {
      if (moment(lote.data_validade).startOf('day').isBefore(moment().startOf('day'))) {
        continue;
      }

      if (quantidadeRestante <= 0) break;

      const quantidadeDoLote = lote.quantidade_atual;
      const quantidadeATirar = Math.min(quantidadeRestante, quantidadeDoLote);

      const novaQuantidadeLote = quantidadeDoLote - quantidadeATirar;
      await connection.execute(
        'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
        [novaQuantidadeLote, lote.id]
      );

      movimentacoesParaRegistrar.push({
        lote_id: lote.id,
        quantidade: quantidadeATirar,
        numero_lote: lote.numero_lote // Adiciona numero_lote para recriação
      });

      quantidadeRestante -= quantidadeATirar;
    }

    if (quantidadeRestante > 0) {
      await connection.rollback();
      return res.status(400).json({ message: `Quantidade insuficiente em estoque central para o insumo solicitado. Faltam ${quantidadeRestante} unidades.` });
    }

    // 4. Inserir movimentação(ões) como transferência do estoque central para a unidade solicitante
    for (const mov of movimentacoesParaRegistrar) {
      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
        [mov.lote_id, 'transferencia', mov.quantidade, responsavel_id, almoxarifeCentralUnidadeId, unidade_solicitante_id]
      );

      // Efetuar a "entrada" do insumo na unidade de destino (almoxarife local)
      // Verifica se o lote já existe na unidade de destino
      const [loteDestinoExistente] = await connection.execute(
        `SELECT id, quantidade_atual FROM lotes WHERE insumo_id = ? AND numero_lote = ? AND unidade_id = ?`,
        [insumo_id, mov.numero_lote, unidade_solicitante_id] // Usa numero_lote do lote de origem
      );

      if (loteDestinoExistente.length > 0) {
        // Atualiza a quantidade do lote existente na unidade de destino
        await connection.execute(
          `UPDATE lotes SET quantidade_atual = quantidade_atual + ? WHERE id = ?`,
          [mov.quantidade, loteDestinoExistente[0].id]
        );
      } else {
        // Cria um novo lote na unidade de destino com os dados do lote de origem
        const [loteOrigemData] = await connection.execute(
          `SELECT data_validade FROM lotes WHERE id = ?`,
          [mov.lote_id]
        );
        await connection.execute(
          `INSERT INTO lotes (insumo_id, numero_lote, quantidade_inicial, quantidade_atual, data_validade, unidade_id) VALUES (?, ?, ?, ?, ?, ?)`,
          [insumo_id, mov.numero_lote, mov.quantidade, mov.quantidade, loteOrigemData[0].data_validade, unidade_solicitante_id]
        );
      }
      // Chamar checkAndCreateAlerts para a unidade de destino após a entrada
      await checkAndCreateAlerts(unidade_solicitante_id);
    }

    // 5. Atualizar status de solicitacoes_insumo para 'aprovada'
    await connection.execute(
      'UPDATE solicitacoes_insumo SET status = ?, data_atualizacao = NOW() WHERE id = ?',
      ['aprovada', solicitacaoId]
    );

    // Chamar checkAndCreateAlerts para a unidade de origem (central) após a saída
    await checkAndCreateAlerts(almoxarifeCentralUnidadeId);

    await connection.commit();
    res.json({ message: 'Solicitação aprovada e estoque central atualizado com sucesso!' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erro ao aprovar solicitação e dar baixa no estoque central:', error);
    res.status(500).json({ message: 'Erro no servidor ao processar aprovação da solicitação.' });
  } finally {
    if (connection) connection.release();
  }
});

// NOVA ROTA: Rota para almoxarife central rejeitar solicitações de almoxarifes locais
router.put('/almoxarifes-locais/:id/rejeitar', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { id } = req.params;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verificar se a solicitação é do tipo 'central'
    const [solicitacaoRows] = await connection.execute(
      `SELECT si.id, si.tipo_solicitacao
       FROM solicitacoes_insumo si
       WHERE si.id = ?`,
      [id]
    );

    const solicitacao = solicitacaoRows[0];
    if (!solicitacao || solicitacao.tipo_solicitacao !== 'central') {
      await connection.rollback();
      return res.status(403).json({ message: 'Acesso negado: Esta solicitação não é para o almoxarifado central.' });
    }

    const [result] = await connection.execute(
      'UPDATE solicitacoes_insumo SET status = ?, data_atualizacao = NOW() WHERE id = ?',
      ['rejeitada', id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    await connection.commit();
    res.json({ message: `Solicitação ${id} rejeitada com sucesso pelo almoxarife central.` });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erro ao rejeitar solicitação do almoxarife central:', error);
    res.status(500).json({ message: 'Erro no servidor ao rejeitar solicitação.' });
  } finally {
    if (connection) connection.release();
  }
});


// Rota existente para obter solicitação de insumo por ID (opcional, mas bom para visualização detalhada)
router.get('/:id', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local', 'gestor', 'profissional_saude']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.userId;
  const userRole = req.user.tipo_usuario;

  try {
    let query = `
      SELECT
        si.id,
        si.quantidade,
        si.status,
        si.data_solicitacao,
        si.data_atualizacao,
        i.nome AS insumo_nome,
        i.unidade_medida,
        u.nome AS solicitante_nome,
        uh.nome AS unidade_solicitante_nome,
        uh.id AS unidade_solicitante_id,
        si.tipo_solicitacao
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      JOIN usuarios u ON si.solicitante_id = u.id
      JOIN unidades_hospitalares uh ON u.unidade_id = uh.id
      WHERE si.id = ?
    `;
    const params = [requestId];

    // Restringir acesso para gestor/profissional_saude apenas às suas próprias solicitações (tipo 'local')
    if (userRole === 'gestor' || userRole === 'profissional_saude') {
      query += ' AND si.solicitante_id = ? AND si.tipo_solicitacao = "local"';
      params.push(userId);
    }
    // Para almoxarife_local, restringir às solicitações de sua unidade (tipo 'local') OU suas próprias solicitações do tipo 'central'
    else if (userRole === 'almoxarife_local') {
      query += ' AND ( (uh.id = ? AND si.tipo_solicitacao = "local") OR (si.solicitante_id = ? AND si.tipo_solicitacao = "central") )';
      params.push(req.user.unidade_id, userId);
    }
    // Almoxarife_central pode ver qualquer solicitação por ID (local ou central)
    // Não precisa de filtro adicional aqui, pois ele pode ver tudo por ID.

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada ou você não tem permissão para vê-la.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar solicitação de insumo única:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar solicitação de insumo.' });
  }
});

module.exports = router;
