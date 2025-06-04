const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  try {
    if (req.user.tipo_usuario === 'estoquista' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Access denied.');
    }

    const [rows] = await pool.execute(
      `SELECT a.*, i.nome AS insumo_nome, l.numero_lote
       FROM alertas a
       LEFT JOIN insumos i ON a.insumo_id = i.id
       LEFT JOIN lotes l ON a.lote_id = l.id
       WHERE a.unidade_id = ? AND a.status = 'ativo'
       ORDER BY a.data_alerta DESC`,
      [unidadeId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Server error fetching alerts.' });
  }
});

module.exports = router;