const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Endpoint for submitting insumo requests (already provided)
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

// New Routes:

// 1. Get all insumo requests (for almoxarife_central and almoxarife_local)
router.get('/', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local']), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        si.id,
        si.quantidade,
        si.status,
        si.data_solicitacao,
        si.data_atualizacao,
        i.nome AS insumo_nome,
        i.unidade_medida,
        u.nome AS solicitante_nome
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      JOIN usuarios u ON si.solicitante_id = u.id
      ORDER BY si.data_solicitacao DESC
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching insumo requests:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar solicitações de insumo.' });
  }
});

// 2. Get insumo requests by a specific user (for gestor/profissional_saude to view their own requests)
router.get('/minhas-solicitacoes', authenticateToken, authorizeRoles(['gestor', 'profissional_saude']), async (req, res) => {
  const solicitante_id = req.user.userId;
  try {
    const [rows] = await pool.query(`
      SELECT
        si.id,
        si.quantidade,
        si.status,
        si.data_solicitacao,
        si.data_atualizacao,
        i.nome AS insumo_nome,
        i.unidade_medida
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      WHERE si.solicitante_id = ?
      ORDER BY si.data_solicitacao DESC
    `, [solicitante_id]);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching user\'s insumo requests:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar suas solicitações de insumo.' });
  }
});

// 3. Update status of an insumo request (for almoxarife_central and almoxarife_local)
router.put('/:id/status', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local']), async (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body; // 'aprovada', 'rejeitada', 'concluida'

  if (!status || !['aprovada', 'rejeitada', 'concluida'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido fornecido.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE solicitacoes_insumo SET status = ? WHERE id = ?',
      [status, requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Solicitação de insumo não encontrada.' });
    }

    res.status(200).json({ message: `Status da solicitação ${requestId} atualizado para ${status}.` });
  } catch (error) {
    console.error('Error updating insumo request status:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar o status da solicitação de insumo.' });
  }
});

// 4. Get a single insumo request by ID (optional, but good for detailed view)
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
        u.nome AS solicitante_nome
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      JOIN usuarios u ON si.solicitante_id = u.id
      WHERE si.id = ?
    `;
    const params = [requestId];

    // Restrict access for gestor/profissional_saude to only their own requests
    if (userRole === 'gestor' || userRole === 'profissional_saude') {
      query += ' AND si.solicitante_id = ?';
      params.push(userId);
    }

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Solicitação de insumo não encontrada ou você não tem permissão para acessá-la.' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching single insumo request:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar a solicitação de insumo.' });
  }
});


module.exports = router;