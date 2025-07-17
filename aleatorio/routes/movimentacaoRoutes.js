const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rota para buscar todas as movimentações (apenas para almoxarife_central)
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
    let whereClauses = [];

    // Add filters if present
    if (insumoId) {
      whereClauses.push(`l.insumo_id = ?`);
      params.push(insumoId);
    }
    if (periodo) {
      const days = parseInt(periodo);
      if (!isNaN(days) && days > 0) {
        whereClauses.push(`m.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)`);
        params.push(days);
      }
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY m.data_hora DESC`;

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all movements:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Rota para obter movimentações para uma unidade específica (para almoxarife_local)
router.get('/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  const { insumoId, periodo } = req.query;

  try {
    // Almoxarife Local só pode ver movimentações da sua própria unidade
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
    `;
    let params = [];
    let whereClauses = [];

    // Lógica de filtro para almoxarife local:
    // Deve ver 'entrada' onde a unidade_destino_id é a sua unidade
    // Deve ver 'saida' onde a unidade_origem_id é a sua unidade
    // NÃO deve ver 'transferencia'
    whereClauses.push(`
      (m.tipo = 'entrada' AND m.unidade_destino_id = ?) OR
      (m.tipo = 'saida' AND m.unidade_origem_id = ?) OR
      (m.tipo = 'estorno_cancelamento' AND m.unidade_origem_id = ?)
    `);
    params.push(unidadeId, unidadeId, unidadeId);


    if (insumoId) {
      whereClauses.push(`l.insumo_id = ?`);
      params.push(insumoId);
    }
    if (periodo) {
      const days = parseInt(periodo);
      if (!isNaN(days) && days > 0) {
        whereClauses.push(`m.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)`);
        params.push(days);
      }
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY m.data_hora DESC`;

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching unit-specific movements:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Rota para registrar uma nova movimentação (entrada/saída)
router.post('/', authenticateToken, async (req, res) => {
  const { lote_id, tipo, quantidade, unidade_origem_id, unidade_destino_id } = req.body;
  const responsavel_id = req.user.userId;

  if (!lote_id || !tipo || !quantidade) {
    return res.status(400).json({ message: 'Lote ID, tipo e quantidade são obrigatórios.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [loteRows] = await connection.execute('SELECT quantidade_atual, insumo_id, unidade_id FROM lotes WHERE id = ?', [lote_id]);
    const lote = loteRows[0];

    if (!lote) {
      throw new Error('Lote não encontrado.');
    }

    let novaQuantidade;
    if (tipo === 'entrada') {
      novaQuantidade = lote.quantidade_atual + quantidade;
      await connection.execute(
        'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
        [novaQuantidade, lote_id]
      );
    } else if (tipo === 'saida') {
      if (lote.quantidade_atual < quantidade) {
        throw new Error('Quantidade insuficiente em estoque.');
      }
      novaQuantidade = lote.quantidade_atual - quantidade;
      await connection.execute(
        'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
        [novaQuantidade, lote_id]
      );
    } else {
      throw new Error('Tipo de movimentação inválido. Use "entrada" ou "saida".');
    }

    await connection.execute(
      'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
      [lote_id, tipo, quantidade, responsavel_id, unidade_origem_id || lote.unidade_id, unidade_destino_id]
    );

    await connection.commit();
    res.status(201).json({ message: 'Movimentação registrada com sucesso.' });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao registrar movimentação:', error);
    res.status(500).json({ message: `Erro no servidor ao registrar movimentação: ${error.message}` });
  } finally {
    connection.release();
  }
});

module.exports = router;
