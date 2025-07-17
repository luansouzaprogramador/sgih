const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { checkAndCreateAlerts } = require('../utils/alertService');

const router = express.Router();

// Rota para buscar agendamentos (geral) - acessível para almoxarife_central e almoxarife_local (filtrado)
router.get('/', authenticateToken, async (req, res) => {
  const userRole = req.user.tipo_usuario;
  const userUnidadeId = req.user.unidade_id;

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

    // Almoxarife Local só pode ver agendamentos relacionados à sua unidade (origem ou destino)
    if (userRole === 'almoxarife_local') {
      query += ` WHERE a.unidade_origem_id = ? OR a.unidade_destino_id = ?`;
      params.push(userUnidadeId, userUnidadeId);
    }
    // Almoxarife Central vê todos os agendamentos (sem WHERE adicional)

    query += ` GROUP BY a.id ORDER BY a.data_agendamento DESC`;

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao carregar agendamentos:', error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// Rota para criar um agendamento - Apenas Almoxarife Central
// Status 'pendente': Apenas registra o agendamento, sem movimentação de estoque.
router.post('/', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { unidade_origem_id, unidade_destino_id, data_agendamento, observacao, itens } = req.body;
  const responsavel_agendamento_id = req.user.userId;

  if (!unidade_origem_id || !unidade_destino_id || !data_agendamento || !itens || itens.length === 0) {
    return res.status(400).json({ message: 'Todos os campos obrigatórios (origem, destino, data, itens) devem ser preenchidos.' });
  }

  if (unidade_origem_id === unidade_destino_id) {
    return res.status(400).json({ message: 'A unidade de origem não pode ser a mesma que a unidade de destino.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Inserir o agendamento principal com status 'pendente'
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

      // Verificar se o lote existe e tem quantidade suficiente na unidade de origem
      const [loteRows] = await connection.execute('SELECT quantidade_atual FROM lotes WHERE id = ? AND unidade_id = ?', [item.lote_id, unidade_origem_id]);
      const lote = loteRows[0];

      if (!lote || lote.quantidade_atual < item.quantidade) {
        throw new Error(`Quantidade insuficiente para o lote ${item.lote_id} na unidade de origem. Disponível: ${lote ? lote.quantidade_atual : 0}`);
      }

      // Inserir na tabela agendamento_itens
      await connection.execute(
        'INSERT INTO agendamento_itens (agendamento_id, lote_id, quantidade) VALUES (?, ?, ?)',
        [agendamentoId, item.lote_id, item.quantidade]
      );
      // NENHUMA MOVIMENTAÇÃO DE ESTOQUE OU REGISTRO DE MOVIMENTAÇÃO AQUI (status 'pendente')
    }

    await connection.commit();
    res.status(201).json({ message: 'Agendamento criado com sucesso! Status: Pendente.', agendamentoId: agendamentoId });

  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ message: `Erro no servidor ao criar agendamento: ${error.message}` });
  } finally {
    connection.release();
  }
});

// Endpoint para atualizar o status do agendamento (por almoxarife_central ou almoxarife_local para cancelar)
router.put('/:id/status', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'em_transito', 'concluido', 'cancelado'
  const responsavel_id = req.user.userId;
  const userRole = req.user.tipo_usuario;
  const userUnidadeId = req.user.unidade_id;

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

    // Validações de permissão e transição de status
    if (userRole === 'almoxarife_local') {
      // Almoxarife local só pode cancelar agendamentos que envolvem sua unidade
      if (status === 'cancelado' && agendamento.unidade_origem_id !== userUnidadeId && agendamento.unidade_destino_id !== userUnidadeId) {
        throw new Error('Acesso negado: Você só pode cancelar agendamentos que envolvem sua unidade.');
      }
      // Almoxarife local NÃO pode marcar como 'em_transito' ou 'concluido' via esta rota.
      // A transição para 'concluido' para local é via rota /receive.
      if (status === 'em_transito' || status === 'concluido') {
        throw new Error('Acesso negado: Almoxarifes locais não podem alterar para este status via esta rota.');
      }
    } else if (userRole === 'almoxarife_central') {
      // Almoxarife central pode fazer todas as transições
      if (status === 'em_transito' && currentStatus !== 'pendente') {
        throw new Error('Agendamento deve estar pendente para ir para em trânsito.');
      }
      if (status === 'concluido' && currentStatus !== 'em_transito') {
        throw new Error('Agendamento deve estar em trânsito para ser concluído pelo almoxarife central.');
      }
      if (status === 'cancelado' && (currentStatus !== 'pendente' && currentStatus !== 'em_transito')) {
        throw new Error('Agendamento só pode ser cancelado se estiver pendente ou em trânsito.');
      }
    }


    // Lógica de movimentação de estoque e registro
    if (status === 'em_transito') {
      // Ação do Almoxarife Central: Marca como "em_transito"
      // -> Deduz estoque da origem
      // -> Registra SAÍDA para local de origem (visível para local de origem e central)
      const [itensAgendadosRows] = await connection.execute(
        'SELECT lote_id, quantidade FROM agendamento_itens WHERE agendamento_id = ?',
        [id]
      );

      for (const item of itensAgendadosRows) {
        // 1. Deduzir a quantidade do lote na unidade de origem
        const [loteOrigemRows] = await connection.execute(
          'SELECT quantidade_atual FROM lotes WHERE id = ? AND unidade_id = ?',
          [item.lote_id, agendamento.unidade_origem_id]
        );
        const loteOrigem = loteOrigemRows[0];

        if (!loteOrigem || loteOrigem.quantidade_atual < item.quantidade) {
          throw new Error(`Quantidade insuficiente para o lote ${item.lote_id} na unidade de origem ao marcar como em trânsito.`);
        }

        const novaQuantidadeOrigem = loteOrigem.quantidade_atual - item.quantidade;
        await connection.execute(
          'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
          [novaQuantidadeOrigem, item.lote_id]
        );

        // 2. Registrar movimentação de SAÍDA para a unidade de origem
        // Esta movimentação será visível tanto para o almoxarife local de origem quanto para o almoxarife central.
        await connection.execute(
          'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
          [item.lote_id, 'saida', item.quantidade, responsavel_id, agendamento.unidade_origem_id]
        );
      }
    } else if (status === 'concluido') {
      // Ação do Almoxarife Central: Marca como "concluido" (se forçadamente)
      // -> Adiciona estoque ao destino
      // -> Registra ENTRADA para local de destino (visível para local de destino e central)
      // -> Registra TRANSFERÊNCIA para central (concluída)
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

        let loteParaMovimentacaoId; // Este será o ID do lote na unidade de destino

        if (loteDestinoRows.length > 0) {
          // Lote já existe na unidade de destino, apenas atualiza a quantidade
          const loteDestino = loteDestinoRows[0];
          const novaQuantidade = loteDestino.quantidade_atual + item.quantidade;
          await connection.execute(
            'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
            [novaQuantidade, loteDestino.id]
          );
          loteParaMovimentacaoId = loteDestino.id;
        } else {
          // Lote não existe na unidade de destino, cria um novo
          const [result] = await connection.execute(
            'INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [originalLote.insumo_id, originalLote.numero_lote, originalLote.data_validade, item.quantidade, item.quantidade, 'ativo', unidade_destino_id]
          );
          loteParaMovimentacaoId = result.insertId;
        }

        // Registrar movimentação de ENTRADA na unidade de destino (visão do almoxarife local de destino e central)
        await connection.execute(
          'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
          [loteParaMovimentacaoId, 'entrada', item.quantidade, responsavel_id, agendamento.unidade_origem_id, unidade_destino_id]
        );

        // Registrar movimentação de TRANSFERÊNCIA (visão do almoxarife central de conclusão)
        await connection.execute(
          'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
          [loteParaMovimentacaoId, 'transferencia', item.quantidade, responsavel_id, agendamento.unidade_origem_id, unidade_destino_id]
        );
      }
    } else if (status === 'cancelado') {
      // Ação de Almoxarife Central ou Local: Marca como "cancelado"
      // -> Se estava em_transito, estorna estoque e registra estorno
      if (currentStatus === 'em_transito') {
        const [itensAgendadosRows] = await connection.execute(
          'SELECT lote_id, quantidade FROM agendamento_itens WHERE agendamento_id = ?',
          [id]
        );

        for (const item of itensAgendadosRows) {
          // Estornar a quantidade para a unidade de origem
          await connection.execute(
            'UPDATE lotes SET quantidade_atual = quantidade_atual + ? WHERE id = ?',
            [item.quantidade, item.lote_id]
          );
          // Registrar movimentação de ESTORNO/CANCELAMENTO
          await connection.execute(
            'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
            [item.lote_id, 'estorno_cancelamento', item.quantidade, responsavel_id, agendamento.unidade_origem_id]
          );
        }
      }
      // Se estava 'pendente', não há estoque para estornar nem movimentação para reverter.
    }

    await connection.execute('UPDATE agendamentos SET status = ? WHERE id = ?', [status, id]);
    await connection.commit();

    // Após atualização, verificar alertas para unidades envolvidas
    await checkAndCreateAlerts(agendamento.unidade_origem_id);
    if (agendamento.unidade_destino_id) {
      await checkAndCreateAlerts(agendamento.unidade_destino_id);
    }

    res.json({ message: `Status do agendamento atualizado para ${status} com sucesso.` });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao atualizar status do agendamento:', error);
    res.status(500).json({ message: `Erro no servidor ao atualizar status do agendamento: ${error.message}` });
  } finally {
    connection.release();
  }
});

// NOVA ROTA: Permitir que almoxarife_local na unidade de destino marque um agendamento como recebido/concluído
// Lida com a transição para 'concluido'
router.put('/:id/receive', authenticateToken, authorizeRoles(['almoxarife_local']), async (req, res) => {
  const { id } = req.params;
  const responsavel_id = req.user.userId;
  const almoxarifeLocalUnidadeId = req.user.unidade_id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [agendamentoRows] = await connection.execute(
      'SELECT * FROM agendamentos WHERE id = ?',
      [id]
    );
    const agendamento = agendamentoRows[0];

    if (!agendamento) {
      throw new Error('Agendamento não encontrado.');
    }

    // Garantir que o usuário atual é um almoxarife_local e está na unidade de destino deste agendamento
    if (agendamento.unidade_destino_id !== almoxarifeLocalUnidadeId) {
      throw new Error('Acesso negado: Este agendamento não é para sua unidade de destino.');
    }

    if (agendamento.status === 'concluido') {
      throw new Error('Agendamento já está concluído.');
    }
    if (agendamento.status === 'cancelado') {
      throw new Error('Agendamento foi cancelado e não pode ser recebido.');
    }
    if (agendamento.status !== 'em_transito') {
      throw new Error('Agendamento deve estar "em trânsito" para ser recebido.');
    }

    // Buscar itens para este agendamento
    const [itensAgendadosRows] = await connection.execute(
      'SELECT lote_id, quantidade FROM agendamento_itens WHERE agendamento_id = ?',
      [id]
    );

    for (const item of itensAgendadosRows) {
      const unidade_destino_id = agendamento.unidade_destino_id;

      // Buscar informações do lote original (do qual a quantidade foi deduzida na origem)
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

      let loteParaMovimentacaoId; // Este será o ID do lote na unidade de destino

      if (loteDestinoRows.length > 0) {
        // Lote já existe na unidade de destino, apenas atualiza a quantidade
        const loteDestino = loteDestinoRows[0];
        const novaQuantidade = loteDestino.quantidade_atual + item.quantidade;
        await connection.execute(
          'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
          [novaQuantidade, loteDestino.id]
        );
        loteParaMovimentacaoId = loteDestino.id;
      } else {
        // Lote não existe na unidade de destino, cria um novo
        const [result] = await connection.execute(
          'INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [originalLote.insumo_id, originalLote.numero_lote, originalLote.data_validade, item.quantidade, item.quantidade, 'ativo', unidade_destino_id]
        );
        loteParaMovimentacaoId = result.insertId;
      }

      // Registrar movimentação de ENTRADA na unidade de destino (visão do almoxarife local de destino e central)
      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
        [loteParaMovimentacaoId, 'entrada', item.quantidade, responsavel_id, agendamento.unidade_origem_id, unidade_destino_id]
      );

      // Registrar movimentação de TRANSFERÊNCIA (visão do almoxarife central de conclusão)
      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
        [loteParaMovimentacaoId, 'transferencia', item.quantidade, responsavel_id, agendamento.unidade_origem_id, unidade_destino_id]
      );
    }

    // Atualizar status do agendamento para 'concluido'
    await connection.execute('UPDATE agendamentos SET status = ? WHERE id = ?', ['concluido', id]);
    await connection.commit();

    // Verificar alertas para a unidade de destino após receber os itens
    await checkAndCreateAlerts(almoxarifeLocalUnidadeId);

    res.json({ message: 'Agendamento recebido e estoque atualizado com sucesso.' });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao receber agendamento:', error);
    res.status(500).json({ message: `Erro no servidor ao receber agendamento: ${error.message}` });
  } finally {
    connection.release();
  }
});

module.exports = router;
