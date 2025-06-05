const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { checkAndCreateAlerts } = require('../utils/alertService');

const router = express.Router();

// Route for fetching agendamentos for a specific unit (with unidadeId)
router.get('/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  try {
    let query = `
      SELECT a.*,
             GROUP_CONCAT(ai.quantidade, 'x ', i.nome, ' (Lote: ', l.numero_lote, ')') AS itens_agendados_str,
             uo.nome AS unidade_origem_nome,
             ud.nome AS unidade_destino_nome,
             u.nome AS responsavel_agendamento_nome
      FROM agendamentos a
      JOIN unidades_hospitalares uo ON a.unidade_origem_id = uo.id
      JOIN unidades_hospitalares ud ON a.unidade_destino_id = ud.id
      JOIN usuarios u ON a.responsavel_agendamento_id = u.id
      LEFT JOIN agendamento_itens ai ON a.id = ai.agendamento_id
      LEFT JOIN lotes l ON ai.lote_id = l.id
      LEFT JOIN insumos i ON l.insumo_id = i.id
    `;
    const params = [];
    if (req.user.tipo_usuario === 'almoxarife_central') {
      query += ` WHERE a.unidade_origem_id = ? OR a.unidade_destino_id = ?`;
      params.push(req.user.unidade_id, req.user.unidade_id);
    } else { // Assume it's a manager or other role when unidadeId is provided
      query += ` WHERE a.unidade_origem_id = ? OR a.unidade_destino_id = ?`;
      params.push(unidadeId, unidadeId);
    }
    query += ` GROUP BY a.id ORDER BY a.data_agendamento DESC`;
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching agendamentos:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Route for fetching all agendamentos (without unidadeId)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT a.*,
             GROUP_CONCAT(ai.quantidade, 'x ', i.nome, ' (Lote: ', l.numero_lote, ')') AS itens_agendados_str,
             uo.nome AS unidade_origem_nome,
             ud.nome AS unidade_destino_nome,
             u.nome AS responsavel_agendamento_nome
      FROM agendamentos a
      JOIN unidades_hospitalares uo ON a.unidade_origem_id = uo.id
      JOIN unidades_hospitalares ud ON a.unidade_destino_id = ud.id
      JOIN usuarios u ON a.responsavel_agendamento_id = u.id
      LEFT JOIN agendamento_itens ai ON a.id = ai.agendamento_id
      LEFT JOIN lotes l ON ai.lote_id = l.id
      LEFT JOIN insumos i ON l.insumo_id = i.id
    `;
    const params = [];
    if (req.user.tipo_usuario === 'almoxarife_central') {
      query += ` WHERE a.unidade_origem_id = ? OR a.unidade_destino_id = ?`;
      params.push(req.user.unidade_id, req.user.unidade_id);
    }
    query += ` GROUP BY a.id ORDER BY a.data_agendamento DESC`;
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching agendamentos:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const {
    unidade_origem_id,
    unidade_destino_id,
    data_agendamento,
    observacao,
    itens, // Array of { lote_id, quantidade }
  } = req.body;
  const responsavel_agendamento_id = req.user.id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      'INSERT INTO agendamentos (unidade_origem_id, unidade_destino_id, data_agendamento, observacao, responsavel_agendamento_id) VALUES (?, ?, ?, ?, ?)',
      [unidade_origem_id, unidade_destino_id, data_agendamento, observacao, responsavel_agendamento_id]
    );
    const agendamentoId = result.insertId;

    for (const item of itens) {
      const [loteRows] = await connection.execute('SELECT quantidade_atual FROM lotes WHERE id = ? AND unidade_id = ?', [item.lote_id, unidade_origem_id]);
      const lote = loteRows[0];

      if (!lote || lote.quantidade_atual < item.quantidade) {
        throw new Error(`Insufficient quantity or batch not found for lote_id ${item.lote_id} in origin unit.`);
      }

      await connection.execute(
        'INSERT INTO agendamento_itens (agendamento_id, lote_id, quantidade) VALUES (?, ?, ?)',
        [agendamentoId, item.lote_id, item.quantidade]
      );
      await connection.execute(
        'UPDATE lotes SET quantidade_atual = quantidade_atual - ? WHERE id = ?',
        [item.quantidade, item.lote_id]
      );
      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
        [item.lote_id, 'transferencia', item.quantidade, responsavel_agendamento_id, unidade_origem_id, unidade_destino_id]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Agendamento created successfully', agendamentoId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating agendamento:', error);
    res.status(500).json({ message: `Server error creating agendamento: ${error.message}` });
  } finally {
    connection.release();
  }
});

router.put('/:id/status', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [agendamentoRows] = await pool.execute('SELECT * FROM agendamentos WHERE id = ?', [id]);
    if (agendamentoRows.length === 0) {
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }

    const currentStatus = agendamentoRows[0].status;
    const validTransitions = {
      'pendente': ['em_transito', 'cancelado'],
      'em_transito': ['concluido', 'cancelado'],
      'concluido': [],
      'cancelado': []
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({ message: 'Transição de status inválida.' });
    }

    await pool.execute(
      'UPDATE agendamentos SET status = ? WHERE id = ?',
      [status, id]
    );
    res.json({ message: 'Status do agendamento atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar status do agendamento:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar status do agendamento.' });
  }
});


router.post('/:id/concluir', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { id } = req.params;
  const responsavel_id = req.user.id;
  const unidade_destino_id = req.user.unidade_id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [agendamentoRows] = await connection.execute('SELECT * FROM agendamentos WHERE id = ? AND unidade_destino_id = ?', [id, unidade_destino_id]);
    const agendamento = agendamentoRows[0];

    if (!agendamento) {
      throw new Error('Agendamento not found or you do not have permission to conclude it for this unit.');
    }

    if (agendamento.status !== 'pendente' && agendamento.status !== 'em_transito') {
      throw new Error('Agendamento cannot be concluded in its current status.');
    }

    const [itens] = await connection.execute('SELECT lote_id, quantidade FROM agendamento_itens WHERE agendamento_id = ?', [id]);
    for (const item of itens) {
      const [loteDestinoRows] = await connection.execute('SELECT * FROM lotes WHERE id = ? AND unidade_id = ?', [item.lote_id, unidade_destino_id]);
      let loteDestino = loteDestinoRows[0];

      if (loteDestino) {
        await connection.execute(
          'UPDATE lotes SET quantidade_atual = quantidade_atual + ? WHERE id = ?',
          [item.quantidade, item.lote_id]
        );
      } else {
        const [originalLoteRows] = await connection.execute('SELECT * FROM lotes WHERE id = ?', [item.lote_id]);
        const originalLote = originalLoteRows[0];

        if (!originalLote) {
          throw new Error(`Original lote (ID: ${item.lote_id}) not found for transfer.`);
        }

        await connection.execute(
          'INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [originalLote.insumo_id, originalLote.numero_lote, originalLote.data_validade, item.quantidade, item.quantidade, 'ativo', unidade_destino_id]
        );
      }

      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
        [item.lote_id, 'entrada', item.quantidade, responsavel_id, agendamento.unidade_origem_id, unidade_destino_id]
      );
    }

    await connection.execute('UPDATE agendamentos SET status = "concluido" WHERE id = ?', [id]);
    await connection.commit();
    res.json({ message: 'Agendamento concluded successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error concluding agendamento:', error);
    res.status(500).json({ message: `Server error concluding agendamento: ${error.message}` });
  } finally {
    connection.release();
  }
});

module.exports = router;