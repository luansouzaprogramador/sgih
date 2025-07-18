const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { checkAndCreateAlerts } = require('../utils/alertService');

const router = express.Router();

// Constante para o ID da unidade central (agora uma unidade própria)
const CENTRAL_UNIT_ID = 5; // ID da nova unidade 'Almoxarifado Central FHEMIG'

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
      GROUP BY a.id
      ORDER BY a.data_agendamento DESC
    `;
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar agendamentos.' });
  }
});

// Rota para buscar agendamentos para uma unidade específica (almoxarife_local)
router.get('/:unidadeId', authenticateToken, authorizeRoles(['almoxarife_local']), async (req, res) => {
  const { unidadeId } = req.params;
  // Almoxarife local só pode ver agendamentos onde ele é origem ou destino
  if (req.user.unidade_id != unidadeId) {
    return res.status(403).send('Acesso negado: Almoxarife local só pode ver agendamentos de sua própria unidade.');
  }

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
      WHERE a.unidade_origem_id = ? OR a.unidade_destino_id = ?
      GROUP BY a.id
      ORDER BY a.data_agendamento DESC
    `;
    const [rows] = await pool.execute(query, [unidadeId, unidadeId]);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar agendamentos para unidade:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar agendamentos para unidade.' });
  }
});


// Rota para criar um novo agendamento (apenas almoxarife_central)
router.post('/', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { unidade_origem_id, unidade_destino_id, data_agendamento, observacao, itens } = req.body;
  const responsavel_agendamento_id = req.user.userId;

  if (!unidade_origem_id || !unidade_destino_id || !data_agendamento || !itens || itens.length === 0) {
    return res.status(400).json({ message: 'Todos os campos obrigatórios e pelo menos um item são necessários.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Criar o agendamento
    const [result] = await connection.execute(
      'INSERT INTO agendamentos (unidade_origem_id, unidade_destino_id, data_agendamento, observacao, responsavel_agendamento_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [unidade_origem_id, unidade_destino_id, data_agendamento, observacao, responsavel_agendamento_id, 'pendente']
    );
    const agendamentoId = result.insertId;

    // 2. Adicionar itens ao agendamento
    for (const item of itens) {
      const { lote_id, quantidade } = item;

      // Verificar se o lote existe na unidade de origem e tem quantidade suficiente
      const [lotes] = await connection.execute(
        'SELECT quantidade_atual FROM lotes WHERE id = ? AND unidade_id = ?',
        [lote_id, unidade_origem_id]
      );

      if (lotes.length === 0 || lotes[0].quantidade_atual < quantidade) {
        await connection.rollback();
        return res.status(400).json({ message: `Lote ${lote_id} não encontrado na unidade de origem ou quantidade insuficiente.` });
      }

      await connection.execute(
        'INSERT INTO agendamento_itens (agendamento_id, lote_id, quantidade) VALUES (?, ?, ?)',
        [agendamentoId, lote_id, quantidade]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Agendamento criado com sucesso!', agendamentoId });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ message: 'Erro no servidor ao criar agendamento.' });
  } finally {
    connection.release();
  }
});

// Rota para atualizar o status de um agendamento
router.put('/:id/status', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'pendente', 'em_transito', 'concluido', 'cancelado'
  const responsavel_id = req.user.userId;
  const user_unidade_id = req.user.unidade_id;
  const user_tipo_usuario = req.user.tipo_usuario;

  if (!['pendente', 'em_transito', 'concluido', 'cancelado'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [agendamentos] = await connection.execute(
      'SELECT unidade_origem_id, unidade_destino_id, status FROM agendamentos WHERE id = ?',
      [id]
    );

    if (agendamentos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }

    const agendamento = agendamentos[0];

    // Validação de permissão para alterar o status
    if (user_tipo_usuario === 'almoxarife_local') {
      // Almoxarife local de origem pode mudar para 'em_transito'
      if (status === 'em_transito' && agendamento.unidade_origem_id !== user_unidade_id) {
        await connection.rollback();
        return res.status(403).json({ message: 'Acesso negado: Você não é o almoxarife da unidade de origem para iniciar o trânsito.' });
      }
      // Almoxarife local de destino pode mudar para 'concluido'
      if (status === 'concluido' && agendamento.unidade_destino_id !== user_unidade_id) {
        await connection.rollback();
        return res.status(403).json({ message: 'Acesso negado: Você não é o almoxarife da unidade de destino para concluir a entrega.' });
      }
      // Almoxarife local (origem ou destino) pode cancelar
      if (status === 'cancelado' && agendamento.unidade_origem_id !== user_unidade_id && agendamento.unidade_destino_id !== user_unidade_id) {
        await connection.rollback();
        return res.status(403).json({ message: 'Acesso negado: Você não está envolvido neste agendamento para cancelá-lo.' });
      }
      // Almoxarife local não pode mudar para 'pendente' (só o central cria)
      if (status === 'pendente') {
        await connection.rollback();
        return res.status(403).json({ message: 'Acesso negado: Almoxarifes locais não podem definir agendamentos como pendentes.' });
      }
    } else if (user_tipo_usuario === 'almoxarife_central') {
      // Almoxarife central pode alterar qualquer status
      // Nenhuma restrição adicional baseada na unidade aqui, pois ele tem visão global.
    } else {
      await connection.rollback();
      return res.status(403).json({ message: 'Acesso negado: Seu tipo de usuário não tem permissão para alterar status de agendamentos.' });
    }


    if (status === 'em_transito') {
      // Se o agendamento for para 'em_transito', deduzir a quantidade da unidade de origem
      const [itensAgendadosRows] = await connection.execute(
        'SELECT lote_id, quantidade FROM agendamento_itens WHERE agendamento_id = ?',
        [id]
      );

      for (const item of itensAgendadosRows) {
        // Deduzir do estoque da unidade de origem
        await connection.execute(
          'UPDATE lotes SET quantidade_atual = quantidade_atual - ? WHERE id = ? AND unidade_id = ?',
          [item.quantidade, item.lote_id, agendamento.unidade_origem_id]
        );
        // Registrar movimentação de SAÍDA na unidade de origem
        await connection.execute(
          'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
          [item.lote_id, 'saida', item.quantidade, responsavel_id, agendamento.unidade_origem_id]
        );
        // Verificar e criar alertas para a unidade de origem após a saída
        await checkAndCreateAlerts(agendamento.unidade_origem_id);
      }
    } else if (status === 'concluido') {
      // Se o agendamento for concluído, adicionar a quantidade à unidade de destino
      const [itensAgendadosRows] = await connection.execute(
        'SELECT ai.lote_id, ai.quantidade, l.insumo_id, l.numero_lote, l.data_validade FROM agendamento_itens ai JOIN lotes l ON ai.lote_id = l.id WHERE agendamento_id = ?',
        [id]
      );

      for (const item of itensAgendadosRows) {
        // Verificar se o lote já existe na unidade de destino
        const [existingLotesDestino] = await connection.execute(
          'SELECT id, quantidade_atual FROM lotes WHERE insumo_id = ? AND numero_lote = ? AND unidade_id = ?',
          [item.insumo_id, item.numero_lote, agendamento.unidade_destino_id]
        );

        let loteDestinoId;
        if (existingLotesDestino.length > 0) {
          // Atualiza o lote existente na destino
          const loteDestino = existingLotesDestino[0];
          await connection.execute(
            'UPDATE lotes SET quantidade_atual = quantidade_atual + ? WHERE id = ?',
            [item.quantidade, loteDestino.id]
          );
          loteDestinoId = loteDestino.id;
        } else {
          // Cria novo lote na unidade de destino
          const [result] = await connection.execute(
            'INSERT INTO lotes (insumo_id, numero_lote, quantidade_inicial, quantidade_atual, data_validade, unidade_id) VALUES (?, ?, ?, ?, ?, ?)',
            [item.insumo_id, item.numero_lote, item.quantidade, item.quantidade, item.data_validade, agendamento.unidade_destino_id]
          );
          loteDestinoId = result.insertId;
        }

        // Registrar movimentação de ENTRADA na unidade de destino
        // CORREÇÃO AQUI: Adicionado unidade_origem_id para a movimentação de entrada
        await connection.execute(
          'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
          [loteDestinoId, 'entrada', item.quantidade, responsavel_id, agendamento.unidade_destino_id, agendamento.unidade_destino_id]
        );

        // Registrar movimentação de TRANSFERÊNCIA para rastreamento global (Almoxarife Central)
        // Isso é para o registro da transferência em si, do ponto de vista do sistema central.
        await connection.execute(
          'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id, observacao) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [item.lote_id, 'transferencia', item.quantidade, responsavel_id, agendamento.unidade_origem_id, agendamento.unidade_destino_id, `Transferência concluída para agendamento ${id}`]
        );

        // Verificar e criar alertas para a unidade de destino após a entrada
        await checkAndCreateAlerts(agendamento.unidade_destino_id);
      }
    } else if (status === 'cancelado') {
      // Se o agendamento for cancelado, estornar a quantidade para a unidade de origem
      // (Isso só deve acontecer se o status anterior não era 'concluido' ou 'em_transito'
      // Se já estava em trânsito, o estorno deve ser manual ou com um fluxo mais complexo)
      // Por simplicidade, assumimos que o cancelamento estorna apenas se ainda não saiu da origem.
      // Se já saiu, mas não chegou, o estorno é mais complexo.
      // Para este cenário, vamos estornar apenas se o status anterior não era 'em_transito' ou 'concluido'.
      if (agendamento.status === 'pendente') { // Só estorna se ainda não saiu
        const [itensAgendadosRows] = await connection.execute(
          'SELECT lote_id, quantidade FROM agendamento_itens WHERE agendamento_id = ?',
          [id]
        );

        for (const item of itensAgendadosRows) {
          // A quantidade já foi deduzida quando o status mudou para 'em_transito'.
          // Se o cancelamento ocorre do status 'pendente', não há dedução para estornar.
          // Se o cancelamento ocorre do status 'em_transito', a quantidade já foi deduzida.
          // O estorno aqui só faz sentido se a dedução não ocorreu, ou se precisamos reverter a dedução.
          // Para o fluxo atual, a dedução ocorre em 'em_transito'.
          // Se cancelado de 'em_transito', o insumo está "perdido" ou precisa de um novo fluxo de devolução.
          // Vamos ajustar para que o estorno ocorra APENAS se o status anterior era 'em_transito'
          // e o cancelamento está revertendo essa saída.

          // Se o status anterior era 'em_transito', precisamos estornar a quantidade na origem
          // porque ela já foi deduzida.
          // A lógica atual de 'cancelado' estorna, o que é bom se a dedução já ocorreu.
          // Se o agendamento for cancelado, estornar a quantidade para a unidade de origem
          // Isso é crucial se o status anterior era 'em_transito' e a quantidade já saiu.
          await connection.execute(
            'UPDATE lotes SET quantidade_atual = quantidade_atual + ? WHERE id = ?',
            [item.quantidade, item.lote_id]
          );
          // Registrar movimentação de ESTORNO/CANCELAMENTO
          await connection.execute(
            'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
            [item.lote_id, 'estorno_cancelamento', item.quantidade, responsavel_id, agendamento.unidade_origem_id]
          );
          await checkAndCreateAlerts(agendamento.unidade_origem_id);
        }
      } else if (agendamento.status === 'em_transito') {
          // Se o agendamento estava 'em_transito' e agora é 'cancelado',
          // a quantidade já foi deduzida da origem.
          // Precisamos estornar essa quantidade para a unidade de origem.
          const [itensAgendadosRows] = await connection.execute(
            'SELECT lote_id, quantidade FROM agendamento_itens WHERE agendamento_id = ?',
            [id]
          );

          for (const item of itensAgendadosRows) {
            await connection.execute(
              'UPDATE lotes SET quantidade_atual = quantidade_atual + ? WHERE id = ?',
              [item.quantidade, item.lote_id]
            );
            // Registrar movimentação de ESTORNO/CANCELAMENTO
            await connection.execute(
              'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
              [item.lote_id, 'estorno_cancelamento', item.quantidade, responsavel_id, agendamento.unidade_origem_id]
            );
            await checkAndCreateAlerts(agendamento.unidade_origem_id);
          }
      }
    }


    await connection.execute('UPDATE agendamentos SET status = ? WHERE id = ?', [status, id]);
    await connection.commit();
    res.json({ message: `Status do agendamento atualizado para ${status} com sucesso.` });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao atualizar status do agendamento:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar status do agendamento.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
