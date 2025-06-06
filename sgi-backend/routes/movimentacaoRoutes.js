const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// New route to fetch all movements for almoxarife_central
router.get('/', authenticateToken, async (req, res) => {
  const { insumoId, periodo } = req.query;
  try {
    // Only almoxarife_central should access this general route
    if (req.user.tipo_usuario !== 'almoxarife_central') {
      return res.status(403).send('Acesso negado: Somente almoxarifes centrais podem acessar todas as movimentações.');
    }

    let query = `
      SELECT m.*, i.nome AS insumo_nome, l.numero_lote, u.nome AS responsavel_nome, uh_origem.nome AS unidade_origem_nome, uh_destino.nome AS unidade_destino_nome
      FROM movimentacoes m
      JOIN lotes l ON m.lote_id = l.id
      JOIN insumos i ON l.insumo_id = i.id
      JOIN usuarios u ON m.responsavel_id = u.id
      LEFT JOIN unidades_hospitalares uh_origem ON m.unidade_origem_id = uh_origem.id
      LEFT JOIN unidades_hospitalares uh_destino ON m.unidade_destino_id = uh_destino.id
    `;
    let params = [];

    // Add filters if present
    const conditions = [];

    if (insumoId) {
      conditions.push(`l.insumo_id = ?`);
      params.push(insumoId);
    }
    if (periodo) {
      const days = parseInt(periodo);
      if (!isNaN(days) && days > 0) {
        conditions.push(`m.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)`);
        params.push(days);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY m.data_hora DESC`;

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all movements:', error);
    res.status(500).json({ message: 'Server error fetching all movements.' });
  }
});

// Existing route for fetching movements for a specific unit
router.get('/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  const { insumoId, periodo } = req.query;
  try {
    if (req.user.tipo_usuario === 'almoxarife_local' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Acesso negado: Almoxarife local só pode ver movimentações de sua própria unidade.');
    }
    let query = `
      SELECT m.*, i.nome AS insumo_nome, l.numero_lote, u.nome AS responsavel_nome, uh_origem.nome AS unidade_origem_nome, uh_destino.nome AS unidade_destino_nome
      FROM movimentacoes m
      JOIN lotes l ON m.lote_id = l.id
      JOIN insumos i ON l.insumo_id = i.id
      JOIN usuarios u ON m.responsavel_id = u.id
      LEFT JOIN unidades_hospitalares uh_origem ON m.unidade_origem_id = uh_origem.id
      LEFT JOIN unidades_hospitalares uh_destino ON m.unidade_destino_id = uh_destino.id
      WHERE m.unidade_origem_id = ? OR m.unidade_destino_id = ?
    `;
    let params = [unidadeId, unidadeId]; // Added unidade_destino_id to WHERE clause
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