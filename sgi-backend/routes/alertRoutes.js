const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// New route to fetch all active alerts for almoxarife_central
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Only almoxarife_central should access this general route
    if (req.user.tipo_usuario !== 'almoxarife_central') {
      return res.status(403).send('Acesso negado: Somente almoxarifes centrais podem acessar todos os alertas.');
    }

    const [rows] = await pool.execute(
      `SELECT a.*, i.nome AS insumo_nome, l.numero_lote
       FROM alertas a
       LEFT JOIN insumos i ON a.insumo_id = i.id
       LEFT JOIN lotes l ON a.lote_id = l.id
       WHERE a.status = 'ativo'
       ORDER BY a.data_alerta DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all alerts:', error);
    res.status(500).json({ message: 'Server error fetching all alerts.' });
  }
});

// Existing route for fetching alerts for a specific unit
router.get('/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  try {
    // An almoxarife_local can only see their own unit's alerts
    // An almoxarife_central can see any unit's alerts via this route
    if (req.user.tipo_usuario === 'almoxarife_local' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Acesso negado: Almoxarife local só pode ver alertas de sua própria unidade.');
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
    console.error('Error fetching alerts for unit:', error);
    res.status(500).json({ message: 'Server error fetching alerts.' });
  }
});

module.exports = router;