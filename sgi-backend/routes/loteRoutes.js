const express = require('express');
const moment = require('moment');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { checkAndCreateAlerts } = require('../utils/alertService'); // We'll create this utility

const router = express.Router();

router.get('/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  try {
    if (req.user.tipo_usuario === 'almoxarife_central' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Access denied.');
    }

    await checkAndCreateAlerts(unidadeId);

    const [rows] = await pool.execute(
      'SELECT l.*, i.nome AS insumo_nome FROM lotes l JOIN insumos i ON l.insumo_id = i.id WHERE l.unidade_id = ?',
      [unidadeId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/entrada', authenticateToken, authorizeRoles(['almoxarife_central', 'gestor']), async (req, res) => {
  const { insumo_id, numero_lote, data_validade, quantidade, unidade_id } = req.body;
  const responsavel_id = req.user.id;

  try {
    const [result] = await pool.execute(
      'INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, unidade_id) VALUES (?, ?, ?, ?, ?, ?)',
      [insumo_id, numero_lote, data_validade, quantidade, quantidade, unidade_id]
    );
    const loteId = result.insertId;

    await pool.execute(
      'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
      [loteId, 'entrada', quantidade, responsavel_id, unidade_id]
    );

    await checkAndCreateAlerts(unidade_id);

    res.status(201).json({ message: 'Batch added and movement registered successfully', loteId });
  } catch (error) {
    console.error('Error adding batch:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/saida', authenticateToken, authorizeRoles(['almoxarife_central', 'gestor']), async (req, res) => {
  const { lote_id, quantidade_saida, unidade_origem_id } = req.body;
  const responsavel_id = req.user.id;

  try {
    const [loteRows] = await pool.execute('SELECT * FROM lotes WHERE id = ? AND unidade_id = ?', [lote_id, unidade_origem_id]);
    const lote = loteRows[0];

    if (!lote) {
      return res.status(404).json({ message: 'Batch not found in this unit.' });
    }

    if (moment(lote.data_validade).startOf('day').isBefore(moment().startOf('day'))) {
      return res.status(400).json({ message: 'Cannot use expired material.' });
    }
    if (lote.status === 'bloqueado') {
      return res.status(400).json({ message: 'Cannot use blocked material.' });
    }

    if (lote.quantidade_atual < quantidade_saida) {
      return res.status(400).json({ message: 'Insufficient quantity in batch.' });
    }

    const novaQuantidade = lote.quantidade_atual - quantidade_saida;
    await pool.execute(
      'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
      [novaQuantidade, lote_id]
    );
    await pool.execute(
      'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
      [lote_id, 'saida', quantidade_saida, responsavel_id, unidade_origem_id]
    );
    await checkAndCreateAlerts(unidade_origem_id);
    res.json({ message: 'Supply quantity updated and movement registered successfully', novaQuantidade });
  } catch (error) {
    console.error('Error updating batch quantity:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;