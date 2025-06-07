const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/estoque_critico', authenticateToken, authorizeRoles(['gestor']), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
            SELECT l.id AS lote_id, i.nome AS insumo_nome, l.quantidade_atual, uh.nome AS unidade_nome
            FROM lotes l
            JOIN insumos i ON l.insumo_id = i.id
            JOIN unidades_hospitalares uh ON l.unidade_id = uh.id
            WHERE l.quantidade_atual < 20 AND l.status = 'ativo' 
            ORDER BY uh.nome, i.nome
        `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching critical stock report:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;