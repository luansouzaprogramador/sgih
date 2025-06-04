const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  const { insumoId, periodo } = req.query;
  try {
    if (req.user.tipo_usuario === 'estoquista' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Access denied.');
    }
    let query = `
      SELECT m.*, i.nome AS insumo_nome, l.numero_lote, u.nome AS responsavel_nome
      FROM movimentacoes m
      JOIN lotes l ON m.lote_id = l.id
      JOIN insumos i ON l.insumo_id = i.id
      JOIN usuarios u ON m.responsavel_id = u.id
      WHERE m.unidade_origem_id = ?
    `;
    let params = [unidadeId];
    if (insumoId) {
      query += ` AND l.insumo_id = ?`;
      params.push(insumoId);
    }
    if (periodo) {
      const days = parseInt(periodo);
      if (!isNaN(days) && days > 0) {
        query += ` AND m.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
        params.push(days);
      }
    }
    query += ` ORDER BY m.data_hora DESC`;
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching movements:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;