// Filename: solicitacaoRoutes.js
const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const moment = require('moment'); // For date comparisons

const router = express.Router();

// Endpoint for submitting insumo requests
router.post('/', authenticateToken, authorizeRoles(['gestor', 'profissional_saude']), async (req, res) => {
  const { insumo_id, quantidade } = req.body;
  const solicitante_id = req.user.userId;

  if (!insumo_id || !quantidade) {
    return res.status(400).json({ message: 'Insumo ID e quantidade são obrigatórios.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO solicitacoes_insumo (insumo_id, quantidade, solicitante_id) VALUES (?, ?, ?)',
      [insumo_id, quantidade, solicitante_id]
    );
    res.status(201).json({ message: 'Solicitação de insumo registrada com sucesso!', solicitacaoId: result.insertId });
  } catch (error) {
    console.error('Error recording insumo request:', error);
    res.status(500).json({ message: 'Erro no servidor ao registrar solicitação de insumo.' });
  }
});

// Get all insumo requests with filtering based on user role and status
router.get('/', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local', 'gestor', 'profissional_saude']), async (req, res) => {
  const userRole = req.user.tipo_usuario;
  const userId = req.user.userId;
  const userUnidadeId = req.user.unidade_id;
  const { status } = req.query; // Get status filter from query params

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
        uh.id AS unidade_solicitante_id
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      JOIN usuarios u ON si.solicitante_id = u.id
      JOIN unidades_hospitalares uh ON u.unidade_id = uh.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'gestor' || userRole === 'profissional_saude') {
      // Gestor and profissional_saude see only their own requests
      query += ' AND si.solicitante_id = ?';
      params.push(userId);
    } else if (userRole === 'almoxarife_local') {
      // Almoxarife_local sees requests from their own unit
      query += ' AND uh.id = ?';
      params.push(userUnidadeId);
    }
    // Almoxarife_central gets all requests (no additional WHERE clause based on unit/user)

    // Add status filter if provided
    if (status) {
      query += ' AND si.status = ?';
      params.push(status);
    }

    query += ' ORDER BY si.data_solicitacao DESC';

    const [rows] = await pool.execute(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching insumo requests:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar solicitações de insumo.' });
  }
});

// Update solicitation status (for rejection by almoxarife_local, or central if needed for other statuses)
router.put('/:id/status', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Expected values: 'rejeitada'

  if (!['rejeitada'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido para esta rota. Apenas "rejeitada" é permitido.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE solicitacoes_insumo SET status = ?, data_atualizacao = NOW() WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    res.json({ message: `Status da solicitação ${id} atualizado para ${status} com sucesso.` });
  } catch (error) {
    console.error('Erro ao atualizar status da solicitação:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar status da solicitação.' });
  }
});

// New route to approve a solicitation and deduct stock - Only Almoxarife Local
router.put('/:id/aprovar', authenticateToken, authorizeRoles(['almoxarife_local']), async (req, res) => {
  const solicitacaoId = req.params.id;
  const responsavel_id = req.user.userId;
  const almoxarifeUnidadeId = req.user.unidade_id;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Start transaction for atomicity

    // 1. Fetch solicitation details
    const [solicitacaoRows] = await connection.execute(
      `SELECT si.id, si.insumo_id, si.quantidade, u.unidade_id AS unidade_solicitante_id, si.status
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

    // 2. Verify solicitation belongs to the almoxarife_local's unit
    if (solicitacao.unidade_solicitante_id !== almoxarifeUnidadeId) {
      await connection.rollback();
      return res.status(403).json({ message: 'Acesso negado: Esta solicitação não pertence à sua unidade.' });
    }

    const { insumo_id, quantidade: quantidadeSolicitada, unidade_solicitante_id } = solicitacao;

    // 3. Find suitable active lots for insumo_id in unidade_solicitante_id
    // Prioritize non-expired lots, then by earliest expiration date (FIFO-like)
    const [lotesDisponiveis] = await connection.execute(
      `SELECT id, quantidade_atual, data_validade
       FROM lotes
       WHERE insumo_id = ? AND unidade_id = ? AND quantidade_atual > 0 AND status = 'ativo'
       ORDER BY data_validade ASC`, // Order by oldest first
      [insumo_id, unidade_solicitante_id]
    );

    let quantidadeRestante = quantidadeSolicitada;
    const movimentacoesParaRegistrar = [];

    for (const lote of lotesDisponiveis) {
      // Check if lot is expired
      if (moment(lote.data_validade).startOf('day').isBefore(moment().startOf('day'))) {
        // Skip expired lots for fulfilling new requests
        continue;
      }

      if (quantidadeRestante <= 0) break; // All quantity fulfilled

      const quantidadeDoLote = lote.quantidade_atual;
      const quantidadeATirar = Math.min(quantidadeRestante, quantidadeDoLote);

      // Deduct quantity from lot
      const novaQuantidadeLote = quantidadeDoLote - quantidadeATirar;
      await connection.execute(
        'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
        [novaQuantidadeLote, lote.id]
      );

      // Record movement for this specific lot deduction
      movimentacoesParaRegistrar.push({
        lote_id: lote.id,
        quantidade: quantidadeATirar,
      });

      quantidadeRestante -= quantidadeATirar;
    }

    if (quantidadeRestante > 0) {
      await connection.rollback();
      return res.status(400).json({ message: `Quantidade insuficiente em estoque para o insumo solicitado. Faltam ${quantidadeRestante} unidades.` });
    }

    // 4. Insert movimentacao(oes)
    for (const mov of movimentacoesParaRegistrar) {
      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
        [mov.lote_id, 'saida', mov.quantidade, responsavel_id, unidade_solicitante_id]
      );
    }

    // 5. Update solicitacoes_insumo status to 'concluida'
    await connection.execute(
      'UPDATE solicitacoes_insumo SET status = ?, data_atualizacao = NOW() WHERE id = ?',
      ['concluida', solicitacaoId]
    );

    await connection.commit(); // Commit the transaction
    res.json({ message: 'Solicitação aprovada e estoque atualizado com sucesso!' });

  } catch (error) {
    if (connection) await connection.rollback(); // Rollback on error
    console.error('Erro ao aprovar solicitação e dar baixa no estoque:', error);
    res.status(500).json({ message: 'Erro no servidor ao processar aprovação da solicitação.' });
  } finally {
    if (connection) connection.release();
  }
});


// Existing route to get insumo request by ID (optional, but good for detailed view)
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
        uh.id AS unidade_solicitante_id
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      JOIN usuarios u ON si.solicitante_id = u.id
      JOIN unidades_hospitalares uh ON u.unidade_id = uh.id
      WHERE si.id = ?
    `;
    const params = [requestId];

    // Restrict access for gestor/profissional_saude to only their own requests
    if (userRole === 'gestor' || userRole === 'profissional_saude') {
      query += ' AND si.solicitante_id = ?';
      params.push(userId);
    }
    // For almoxarife_local, restrict to requests from their unit
    else if (userRole === 'almoxarife_local') {
      query += ' AND uh.id = ?';
      params.push(req.user.unidade_id);
    }
    // Almoxarife_central can view any request by ID

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada ou você não tem permissão para vê-la.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching single insumo request:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar solicitação de insumo.' });
  }
});

module.exports = router;