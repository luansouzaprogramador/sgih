const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { checkAndCreateAlerts } = require('../utils/alertService');

const router = express.Router();

// Rota para buscar agendamentos (geral) - acessível apenas para almoxarife_central
router.get('/', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
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

    // Se o backend precisar limitar o almoxarife_local APENAS aos agendamentos
    // da sua unidade, a linha abaixo com o WHERE é necessária.
    // Por enquanto, vamos considerar que ele vê TUDO.
    /*
    if (req.user.tipo_usuario === 'almoxarife_local') {
      query += ` WHERE a.unidade_origem_id = ? OR a.unidade_destino_id = ?`;
      params.push(req.user.unidade_id, req.user.unidade_id);
    }
    */

    query += ` GROUP BY a.id ORDER BY a.data_agendamento DESC`;

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching agendamentos:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Route for fetching agendamentos for a specific unit (with unidadeId) - for local almoxarifes/viewing specific unit
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

    // This route is specifically for a given unit ID.
    // An almoxarife_local should only see their own unit's agendamentos.
    // An almoxarife_central could see any unit's agendamentos via this route if needed,
    // but the general `/agendamentos` route is probably more useful for them.
    if (req.user.tipo_usuario === 'almoxarife_local' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Acesso negado: Almoxarife local só pode ver agendamentos de sua própria unidade.');
    }

    query += ` WHERE a.unidade_origem_id = ? OR a.unidade_destino_id = ?`;
    params.push(unidadeId, unidadeId);


    query += ` GROUP BY a.id ORDER BY a.data_agendamento DESC`;

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching agendamentos for unit:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});


router.post('/', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { unidade_origem_id, unidade_destino_id, data_agendamento, observacao, itens } = req.body;
  const responsavel_agendamento_id = req.user.id;

  if (!unidade_origem_id || !unidade_destino_id || !data_agendamento || !itens || itens.length === 0) {
    return res.status(400).json({ message: 'Todos os campos obrigatórios (origem, destino, data, itens) devem ser preenchidos.' });
  }

  if (unidade_origem_id === unidade_destino_id) {
    return res.status(400).json({ message: 'A unidade de origem não pode ser a mesma que a unidade de destino.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Inserir o agendamento principal
    const [result] = await connection.execute(
      'INSERT INTO agendamentos (unidade_origem_id, unidade_destino_id, data_agendamento, observacao, responsavel_agendamento_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [unidade_origem_id, unidade_destino_id, data_agendamento, observacao, responsavel_agendamento_id, 'pendente']
    );
    const agendamentoId = result.insertId;

    // 2. Processar cada item do agendamento
    for (const item of itens) {
      if (!item.lote_id || !item.quantidade || item.quantidade <= 0) {
        throw new Error('Item inválido no agendamento: lote_id e quantidade são obrigatórios e a quantidade deve ser positiva.');
      }

      // 2.1. Inserir na tabela agendamento_itens
      await connection.execute(
        'INSERT INTO agendamento_itens (agendamento_id, lote_id, quantidade) VALUES (?, ?, ?)',
        [agendamentoId, item.lote_id, item.quantidade]
      );

      // 2.2. Atualizar a quantidade do lote na unidade de origem
      const [loteRows] = await connection.execute('SELECT quantidade_atual FROM lotes WHERE id = ? AND unidade_id = ?', [item.lote_id, unidade_origem_id]);
      const lote = loteRows[0];

      if (!lote || lote.quantidade_atual < item.quantidade) {
        throw new Error(`Quantidade insuficiente para o lote ${item.lote_id} na unidade de origem.`);
      }

      const novaQuantidade = lote.quantidade_atual - item.quantidade;
      await connection.execute(
        'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
        [novaQuantidade, item.lote_id]
      );

      // 2.3. Registrar movimentação de SAÍDA na unidade de origem
      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
        [item.lote_id, 'transferencia', item.quantidade, responsavel_agendamento_id, unidade_origem_id, unidade_destino_id]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Agendamento criado com sucesso!', agendamentoId: agendamentoId });

  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ message: `Erro no servidor ao criar agendamento: ${error.message}` });
  } finally {
    connection.release();
  }
});

// Endpoint para atualizar o status do agendamento
router.put('/:id/status', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'em_transito', 'concluido', 'cancelado'
  const responsavel_id = req.user.id;

  if (!['em_transito', 'concluido', 'cancelado'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [agendamentoRows] = await connection.execute('SELECT * FROM agendamentos WHERE id = ?', [id]);
    const agendamento = agendamentoRows[0];

    if (!agendamento) {
      throw new Error('Agendamento não encontrado.');
    }

    const currentStatus = agendamento.status;

    // Lógica de transição de status
    if (status === 'em_transito' && currentStatus !== 'pendente') {
      throw new Error('Agendamento deve estar pendente para ir para em trânsito.');
    }
    if (status === 'concluido' && currentStatus !== 'em_transito') {
      throw new Error('Agendamento deve estar em trânsito para ser concluído.');
    }
    if (status === 'cancelado' && (currentStatus !== 'pendente' && currentStatus !== 'em_transito')) {
      throw new Error('Agendamento só pode ser cancelado se estiver pendente ou em trânsito.');
    }

    // Se o status for "concluido", adicione os insumos à unidade de destino
    if (status === 'concluido') {
      const [itensAgendadosRows] = await connection.execute(
        'SELECT lote_id, quantidade FROM agendamento_itens WHERE agendamento_id = ?',
        [id]
      );

      for (const item of itensAgendadosRows) {
        const unidade_destino_id = agendamento.unidade_destino_id;

        // Buscar informações do lote original da unidade de origem
        const [originalLoteRows] = await connection.execute('SELECT * FROM lotes WHERE id = ?', [item.lote_id]);
        const originalLote = originalLoteRows[0];

        if (!originalLote) {
          throw new Error(`Lote original (ID: ${item.lote_id}) não encontrado.`);
        }

        // Verificar se o lote já existe na unidade de destino (mesmo insumo, mesmo numero_lote, ativo)
        const [loteDestinoRows] = await connection.execute(
          'SELECT id, quantidade_atual FROM lotes WHERE insumo_id = ? AND numero_lote = ? AND unidade_id = ? AND status = "ativo"',
          [originalLote.insumo_id, originalLote.numero_lote, unidade_destino_id]
        );

        if (loteDestinoRows.length > 0) {
          // Lote já existe na unidade de destino, apenas atualiza a quantidade
          const loteDestino = loteDestinoRows[0];
          await connection.execute(
            'UPDATE lotes SET quantidade_atual = quantidade_atual + ? WHERE id = ?',
            [item.quantidade, loteDestino.id]
          );
        } else {
          // Lote não existe na unidade de destino, cria um novo
          await connection.execute(
            'INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [originalLote.insumo_id, originalLote.numero_lote, originalLote.data_validade, item.quantidade, item.quantidade, 'ativo', unidade_destino_id]
          );
        }

        // Registrar movimentação de ENTRADA na unidade de destino
        // Para pegar o ID do lote recém-criado, use LAST_INSERT_ID()
        const novoLoteIdDestinoResult = await connection.execute('SELECT LAST_INSERT_ID() as id');
        const novoLoteIdDestino = loteDestinoRows.length > 0 ? loteDestinoRows[0].id : novoLoteIdDestinoResult[0][0].id;

        await connection.execute(
          'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
          [novoLoteIdDestino, 'entrada', item.quantidade, responsavel_id, agendamento.unidade_origem_id, unidade_destino_id]
        );
      }
    } else if (status === 'cancelado') {
      // Se o agendamento for cancelado, estornar a quantidade para a unidade de origem
      const [itensAgendadosRows] = await connection.execute(
        'SELECT lote_id, quantidade FROM agendamento_itens WHERE agendamento_id = ?',
        [id]
      );

      for (const item of itensAgendadosRows) {
        await connection.execute(
          'UPDATE lotes SET quantidade_atual = quantidade_atual + ? WHERE id = ?',
          [item.quantidade, item.lote_id]
        );
        // Registrar movimentação de ESTORNO/CANCELAMENTO (opcional, mas boa prática)
        await connection.execute(
          'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
          [item.lote_id, 'estorno_cancelamento', item.quantidade, responsavel_id, agendamento.unidade_origem_id]
        );
      }
    }


    await connection.execute('UPDATE agendamentos SET status = ? WHERE id = ?', [status, id]);
    await connection.commit();
    res.json({ message: `Status do agendamento atualizado para ${status} com sucesso.` });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao atualizar status do agendamento:', error);
    res.status(500).json({ message: `Erro no servidor ao atualizar status do agendamento: ${error.message}` });
  } finally {
    connection.release();
  }
});


module.exports = router;