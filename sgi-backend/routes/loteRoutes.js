const express = require('express');
const moment = require('moment');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { checkAndCreateAlerts } = require('../utils/alertService');

const router = express.Router();

router.get('/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  try {
    // Lógica CORRIGIDA:
    // - Almoxarife Central: Pode ver lotes de QUALQUER unidade.
    // - Almoxarife Local: Pode ver lotes APENAS de sua própria unidade.
    // - Gestor: Assume-se que um gestor pode ver todos os lotes, mas para esta rota específica
    //          que filtra por unidade, ele também pode acessar. Se houver uma rota GET /lotes (sem ID),
    //          ela teria authorizeRoles(['gestor', 'almoxarife_central']).
    if (req.user.tipo_usuario === 'almoxarife_local' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Acesso negado: Almoxarife local só pode ver lotes de sua própria unidade.');
    }
    // Para almoxarifes centrais, nenhuma restrição adicional baseada em unidade_id aqui.
    // Eles devem conseguir buscar lotes para qualquer unidade.

    await checkAndCreateAlerts(unidadeId); // Certifique-se de que isso funciona para a unidade em questão

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

router.post('/entrada', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local', 'gestor']), async (req, res) => {
  const { insumo_id, numero_lote, data_validade, quantidade, unidade_id } = req.body;
  const responsavel_id = req.user.userId;

  try {
    // Check if the insumo exists
    const [insumoRows] = await pool.execute('SELECT id FROM insumos WHERE id = ?', [insumo_id]);
    if (insumoRows.length === 0) {
      return res.status(404).json({ message: 'Insumo not found.' });
    }

    // Check if the unit exists
    const [unitRows] = await pool.execute('SELECT id FROM unidades_hospitalares WHERE id = ?', [unidade_id]);
    if (unitRows.length === 0) {
      return res.status(404).json({ message: 'Unit not found.' });
    }

    // Check if a batch with the same insumo_id, numero_lote, and unidade_id already exists and is active
    const [existingLotes] = await pool.execute(
      'SELECT id, quantidade_atual, data_validade, status FROM lotes WHERE insumo_id = ? AND numero_lote = ? AND unidade_id = ? AND status = "ativo"',
      [insumo_id, numero_lote, unidade_id]
    );

    if (existingLotes.length > 0) {
      // If lot exists and is active, update its quantity and data_validade if newer
      const existingLote = existingLotes[0];
      const newQuantity = existingLote.quantidade_atual + quantidade;

      let updateQuery = 'UPDATE lotes SET quantidade_atual = ?';
      const updateParams = [newQuantity];

      // Only update data_validade if the new one is later than the existing one
      if (moment(data_validade).isAfter(moment(existingLote.data_validade))) {
        updateQuery += ', data_validade = ?';
        updateParams.push(data_validade);
      }

      updateQuery += ' WHERE id = ?';
      updateParams.push(existingLote.id);

      await pool.execute(updateQuery, updateParams);
      res.status(200).json({ message: 'Lote atualizado com sucesso e quantidade adicionada.', loteId: existingLote.id });
    } else {
      // If no active lot exists, insert a new one
      const [result] = await pool.execute(
        'INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [insumo_id, numero_lote, data_validade, quantidade, quantidade, 'ativo', unidade_id]
      );
      res.status(201).json({ message: 'Lote criado com sucesso.', loteId: result.insertId });
    }

    // Register movimentacao
    const lote_id = existingLotes.length > 0 ? existingLotes[0].id : result.insertId;
    await pool.execute(
      'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?)',
      [lote_id, 'entrada', quantidade, responsavel_id, unidade_id]
    );

  } catch (error) {
    console.error('Error creating/updating lote (entrada):', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/saida', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local']), async (req, res) => {
  const { lote_id, quantidade_saida, unidade_origem_id } = req.body;
  const responsavel_id = req.user.userId;

  // Ensure almoxarife_local can only manage lots from their own unit
  if (req.user.tipo_usuario === 'almoxarife_local' && req.user.unidade_id !== unidade_origem_id) {
    return res.status(403).json({ message: 'Acesso negado. Almoxarife local só pode registrar saídas da sua própria unidade.' });
  }

  try {
    const [loteRows] = await pool.execute('SELECT * FROM lotes WHERE id = ? AND unidade_id = ?', [lote_id, unidade_origem_id]);
    const lote = loteRows[0];

    if (!lote) {
      return res.status(404).json({ message: 'Batch not found in this unit.' });
    }

    if (moment(lote.data_validade).startOf('day').isBefore(moment().startOf('day'))) {
      return res.status(400).json({ message: 'Cannot use expired material.' });
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

    res.json({ message: 'Saída de lote registrada com sucesso.', newQuantity: novaQuantidade });
  } catch (error) {
    console.error('Error registering lote exit:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.put('/:id/status', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'ativo', 'baixo', 'vencido'

  if (!['ativo', 'bloqueado', 'vencido'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE lotes SET status = ? WHERE id = ?',
      [status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lote not found.' });
    }
    res.json({ message: 'Status do lote atualizado com sucesso.' });
  } catch (error) {
    console.error('Error updating lote status:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;