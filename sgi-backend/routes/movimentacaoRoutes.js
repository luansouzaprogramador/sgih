const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Constante para o ID da unidade central (agora uma unidade própria)
const CENTRAL_UNIT_ID = 5; // ID da nova unidade 'Almoxarifado Central FHEMIG'

// Rota para buscar todas as movimentações (acessível apenas para almoxarife_central)
router.get('/', authenticateToken, async (req, res) => {
  const { insumoId, periodo } = req.query;
  try {
    // Apenas almoxarife_central deve acessar esta rota geral
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
      WHERE 1=1
    `;
    let params = [];

    // Adiciona filtros se presentes
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
    console.error('Erro ao buscar todas as movimentações para o almoxarife central:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar todas as movimentações.' });
  }
});

// Rota para buscar movimentações para uma unidade específica (almoxarife_local)
router.get('/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  const { insumoId, periodo } = req.query;
  try {
    // Um almoxarife_local só pode ver as movimentações de sua própria unidade
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
      WHERE (m.unidade_origem_id = ? OR m.unidade_destino_id = ?)
      AND m.tipo IN ('entrada', 'saida') -- Almoxarifes locais só veem entradas e saídas diretas
    `;
    let params = [unidadeId, unidadeId];

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
    console.error('Erro ao buscar movimentações para unidade específica:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar movimentações.' });
  }
});

module.exports = router;
