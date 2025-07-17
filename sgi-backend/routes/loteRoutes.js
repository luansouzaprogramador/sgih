const express = require('express');
const moment = require('moment');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { checkAndCreateAlerts } = require('../utils/alertService');

const router = express.Router();

// Constante para o ID da unidade central (agora uma unidade própria)
const CENTRAL_UNIT_ID = 5; // ID da nova unidade 'Almoxarifado Central FHEMIG'

// Rota existente para obter lotes para uma unidade específica
router.get('/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  try {
    // Almoxarife Local só pode ver lotes da sua própria unidade
    if (req.user.tipo_usuario === 'almoxarife_local' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Acesso negado: Almoxarife local só pode ver lotes de sua própria unidade.');
    }

    // Se o usuário é almoxarife central, ele pode ver lotes da unidade central ou de outras unidades
    // (se a unidadeId for diferente de 'all' ou da unidade central, ele está buscando uma unidade específica)
    // A chamada a checkAndCreateAlerts deve ser feita para a unidade que está sendo visualizada/operada.
    // Se unidadeId é 'all' para almoxarife central, não chamamos checkAndCreateAlerts aqui, pois é uma agregação.
    if (unidadeId !== 'all') {
        await checkAndCreateAlerts(parseInt(unidadeId)); // Garante que os alertas são verificados para a unidade
    }

    // Adicionado i.estoque_minimo na seleção
    const [rows] = await pool.execute(
      'SELECT l.*, i.nome AS insumo_nome, i.estoque_minimo FROM lotes l JOIN insumos i ON l.insumo_id = i.id WHERE l.unidade_id = ?',
      [unidadeId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao carregar lotes:', error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// Rota para criar um novo lote
router.post('/', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local']), async (req, res) => {
  const { insumo_id, numero_lote, quantidade_inicial, data_validade, unidade_id } = req.body;
  const responsavel_id = req.user.userId;

  if (!insumo_id || !numero_lote || !quantidade_inicial || !data_validade || !unidade_id) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  // Almoxarife local só pode criar lotes para sua própria unidade
  if (req.user.tipo_usuario === 'almoxarife_local' && req.user.unidade_id != unidade_id) {
    return res.status(403).send('Acesso negado: Almoxarife local só pode criar lotes para sua própria unidade.');
  }
  // Almoxarife central só pode criar lotes para a unidade central (que agora é o req.user.unidade_id)
  if (req.user.tipo_usuario === 'almoxarife_central' && req.user.unidade_id != unidade_id) {
    return res.status(403).send('Acesso negado: Almoxarife central só pode criar lotes para o estoque central.');
  }


  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Inserir o novo lote
    const [result] = await connection.execute(
      'INSERT INTO lotes (insumo_id, numero_lote, quantidade_inicial, quantidade_atual, data_validade, unidade_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [insumo_id, numero_lote, quantidade_inicial, quantidade_inicial, data_validade, unidade_id, 'ativo']
    );
    const loteId = result.insertId;

    // Registrar a movimentação de entrada
    await connection.execute(
      'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?)',
      [loteId, 'entrada', quantidade_inicial, responsavel_id, unidade_id]
    );

    await connection.commit();
    await checkAndCreateAlerts(unidade_id); // Chamar após a criação do lote e movimentação
    res.status(201).json({ message: 'Lote criado e movimentação registrada com sucesso.', loteId: loteId });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar lote e registrar movimentação:', error);
    res.status(500).json({ message: 'Erro no servidor ao criar lote.' });
  } finally {
    connection.release();
  }
});

// Rota para atualizar um lote existente
router.put('/:id', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local']), async (req, res) => {
  const { id } = req.params;
  const { insumo_id, numero_lote, quantidade_inicial, quantidade_atual, data_validade, unidade_id, status } = req.body;

  if (!insumo_id || !numero_lote || !quantidade_inicial || !quantidade_atual || !data_validade || !unidade_id || !status) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  // Almoxarife local só pode atualizar lotes da sua própria unidade
  if (req.user.tipo_usuario === 'almoxarife_local' && req.user.unidade_id != unidade_id) {
    return res.status(403).send('Acesso negado: Almoxarife local só pode atualizar lotes de sua própria unidade.');
  }
  // Almoxarife central só pode atualizar lotes da unidade central (que agora é o req.user.unidade_id)
  if (req.user.tipo_usuario === 'almoxarife_central' && req.user.unidade_id != unidade_id) {
    return res.status(403).send('Acesso negado: Almoxarife central só pode atualizar lotes do estoque central.');
  }

  try {
    const [result] = await pool.execute(
      'UPDATE lotes SET insumo_id = ?, numero_lote = ?, quantidade_inicial = ?, quantidade_atual = ?, data_validade = ?, unidade_id = ?, status = ? WHERE id = ?',
      [insumo_id, numero_lote, quantidade_inicial, quantidade_atual, data_validade, unidade_id, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lote não encontrado.' });
    }
    // Chamar checkAndCreateAlerts para a unidade do lote atualizado
    const [loteUnit] = await pool.execute('SELECT unidade_id FROM lotes WHERE id = ?', [id]);
    if (loteUnit.length > 0) {
      await checkAndCreateAlerts(loteUnit[0].unidade_id);
    }

    res.json({ message: 'Lote atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar lote:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar lote.' });
  }
});

// NOVA ROTA: Registrar múltiplas entradas de lote de uma vez (em massa)
router.post('/entrada-lote-em-massa', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local']), async (req, res) => {
  const { entries } = req.body;
  const responsavel_id = req.user.userId;

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ message: 'Nenhuma entrada de lote fornecida.' });
  }

  const results = []; // Para armazenar o resultado de cada entrada

  for (const entry of entries) {
    const { insumo_id, numero_lote, quantidade, data_validade, unidade_id } = entry;

    // Validação de permissão baseada na unidade_id da entrada
    if (req.user.tipo_usuario === 'almoxarife_local' && req.user.unidade_id != unidade_id) {
      results.push({ success: false, message: `Acesso negado: Almoxarife local só pode criar lotes para sua própria unidade. (Insumo ID: ${insumo_id || 'N/A'}, Lote: ${numero_lote || 'N/A'})` });
      continue;
    }
    // Para almoxarife_central, a unidade_id da entrada DEVE ser o req.user.unidade_id (que agora é o CENTRAL_UNIT_ID)
    if (req.user.tipo_usuario === 'almoxarife_central' && req.user.unidade_id != unidade_id) {
      results.push({ success: false, message: `Acesso negado: Almoxarife central só pode registrar entradas para o estoque central (Unidade ID: ${req.user.unidade_id}). (Insumo ID: ${insumo_id || 'N/A'}, Lote: ${numero_lote || 'N/A'}, Unidade Fornecida: ${unidade_id || 'N/A'})` });
      continue;
    }

    // Validação básica para todas as entradas
    if (!insumo_id || !numero_lote || !quantidade || !data_validade || quantidade <= 0 || !unidade_id) {
      results.push({ success: false, message: `Dados incompletos ou inválidos para um dos itens (Insumo ID: ${insumo_id || 'N/A'}, Lote: ${numero_lote || 'N/A'}, Qtd: ${quantidade || 'N/A'}, Validade: ${data_validade || 'N/A'}, Unidade: ${unidade_id || 'N/A'}).` });
      continue; // Pula para a próxima entrada no loop
    }

    const connection = await pool.getConnection(); // Obtém uma nova conexão para cada iteração
    try {
      await connection.beginTransaction();

      // Verifica se o lote existe para este insumo e unidade
      const [existingLotes] = await connection.execute(
        'SELECT * FROM lotes WHERE insumo_id = ? AND numero_lote = ? AND unidade_id = ?',
        [insumo_id, numero_lote, unidade_id]
      );

      let loteId;
      let actionMessage;

      if (existingLotes.length > 0) {
        // Atualiza o lote existente
        const lote = existingLotes[0];
        const novaQuantidade = lote.quantidade_atual + quantidade;

        let updateQuery = 'UPDATE lotes SET quantidade_atual = ?';
        const updateParams = [novaQuantidade];

        // Only update data_validade if the new one is later than the existing one
        if (moment(data_validade).isAfter(moment(lote.data_validade))) {
          updateQuery += ', data_validade = ?';
          updateParams.push(data_validade);
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(lote.id);

        await connection.execute(updateQuery, updateParams);

        loteId = lote.id;
        actionMessage = 'Lote existente atualizado.';
      } else {
        // Cria um novo lote
        const [result] = await connection.execute(
          'INSERT INTO lotes (insumo_id, numero_lote, quantidade_inicial, quantidade_atual, data_validade, unidade_id) VALUES (?, ?, ?, ?, ?, ?)',
          [insumo_id, numero_lote, quantidade, quantidade, data_validade, unidade_id] // Adicionado quantidade_inicial aqui
        );
        loteId = result.insertId;
        actionMessage = 'Novo lote criado.';
      }

      // Registra a movimentação para a entrada
      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
        [loteId, 'entrada', quantidade, responsavel_id, unidade_id, unidade_id] // Para entrada, origem e destino são a mesma unidade
      );

      results.push({ success: true, message: `Entrada para insumo ${insumo_id}, lote ${numero_lote} registrada com sucesso. ${actionMessage}` });

      // Após a entrada bem-sucedida, verifica alertas (estoque crítico, vencimento)
      await checkAndCreateAlerts(unidade_id);

      await connection.commit(); // Confirma a transação para esta entrada individual

    } catch (error) {
      await connection.rollback(); // Reverte a transação para esta entrada individual
      console.error(`Erro ao processar entrada para insumo ${insumo_id}, lote ${numero_lote}:`, error);
      results.push({ success: false, message: `Erro ao processar entrada para insumo ${insumo_id}, lote ${numero_lote}: ${error.message}` });
    } finally {
      connection.release(); // Libera a conexão
    }
  }

  // Determina o status geral da resposta com base nos resultados individuais
  const allSuccess = results.every(r => r.success);
  const someSuccess = results.some(r => r.success);

  if (allSuccess) {
    res.status(200).json({ message: 'Todas as entradas foram processadas com sucesso.', results });
  } else if (someSuccess) {
    res.status(206).json({ message: 'Algumas entradas foram processadas com sucesso, mas outras falharam.', results }); // 206 Partial Content
  } else {
    res.status(400).json({ message: 'Nenhuma entrada pôde ser processada devido a erros.', results });
  }
});


// Rota para registrar uma saída de lote (deduzir do estoque) - Apenas Almoxarife Local
router.post('/saida', authenticateToken, authorizeRoles(['almoxarife_local']), async (req, res) => {
  const { lote_id, quantidade_saida, unidade_origem_id } = req.body;
  const responsavel_id = req.user.userId;

  if (!lote_id || !quantidade_saida || !unidade_origem_id) {
    return res.status(400).json({ message: 'Lote ID, quantidade de saída e unidade de origem são obrigatórios.' });
  }

  try {
    const [lotes] = await pool.execute(
      'SELECT quantidade_atual FROM lotes WHERE id = ? AND unidade_id = ?',
      [lote_id, unidade_origem_id]
    );

    if (lotes.length === 0) {
      return res.status(404).json({ message: 'Lote não encontrado ou não pertence a esta unidade.' });
    }

    const lote = lotes[0];
    if (lote.quantidade_atual < quantidade_saida) {
      return res.status(400).json({ message: 'Quantidade insuficiente em estoque para esta saída.' });
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

    // Após a saída bem-sucedida, verifica alertas (estoque crítico, vencimento)
    await checkAndCreateAlerts(unidade_origem_id);

    res.json({ message: 'Saída de lote registrada com sucesso.', newQuantity: novaQuantidade });
  } catch (error) {
    console.error('Erro ao registrar saída de lote:', error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
});

// Atualizar status do lote - Apenas Almoxarife Central
router.put('/:id/status', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'ativo', 'baixo', 'vencido'

  if (!['ativo', 'baixo', 'vencido'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE lotes SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lote não encontrado.' });
    }
    // Chamar checkAndCreateAlerts para a unidade do lote atualizado
    const [loteUnit] = await pool.execute('SELECT unidade_id FROM lotes WHERE id = ?', [id]);
    if (loteUnit.length > 0) {
      await checkAndCreateAlerts(loteUnit[0].unidade_id);
    }

    res.json({ message: 'Status do lote atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar status do lote:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar status do lote.' });
  }
});

// Transferir um lote entre unidades - Apenas Almoxarife Central
router.post('/transferir', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { lote_id, quantidade, unidade_origem_id, unidade_destino_id } = req.body;
  const responsavel_id = req.user.userId;

  if (!lote_id || !quantidade || !unidade_origem_id || !unidade_destino_id) {
    return res.status(400).json({ message: 'Lote ID, quantidade, unidade de origem e unidade de destino são obrigatórios.' });
  }
  if (unidade_origem_id === unidade_destino_id) {
    return res.status(400).json({ message: 'A unidade de origem não pode ser a mesma que a unidade de destino.' });
  }
  // Garantir que a origem da transferência é o estoque central se o usuário é almoxarife central
  if (req.user.tipo_usuario === 'almoxarife_central' && unidade_origem_id != req.user.unidade_id) {
    return res.status(403).send('Acesso negado: Almoxarife central só pode transferir do estoque central.');
  }


  const connection = await pool.getConnection(); // Obtém uma conexão para transação
  try {
    await connection.beginTransaction(); // Inicia a transação

    // 1. Obtém detalhes do lote e garante quantidade suficiente na origem
    const [lotes] = await connection.execute(
      'SELECT * FROM lotes WHERE id = ? AND unidade_id = ?',
      [lote_id, unidade_origem_id]
    );

    if (lotes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Lote não encontrado na unidade de origem especificada.' });
    }

    const loteOrigem = lotes[0];
    if (loteOrigem.quantidade_atual < quantidade) {
      await connection.rollback();
      return res.status(400).json({ message: 'Quantidade insuficiente em estoque para esta transferência.' });
    }

    // 2. Deduz a quantidade do lote de origem
    const novaQuantidadeOrigem = loteOrigem.quantidade_atual - quantidade;
    await connection.execute(
      'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
      [novaQuantidadeOrigem, lote_id]
    );

    // 3. Verifica se o lote de destino existe na unidade de destino (mesmo insumo, mesmo numero_lote)
    const [existingLotesDestino] = await connection.execute(
      'SELECT * FROM lotes WHERE insumo_id = ? AND numero_lote = ? AND unidade_id = ?',
      [loteOrigem.insumo_id, loteOrigem.numero_lote, unidade_destino_id]
    );

    let loteDestinoId;
    if (existingLotesDestino.length > 0) {
      // Atualiza o lote existente na destino
      const loteDestino = existingLotesDestino[0];
      const novaQuantidadeDestino = loteDestino.quantidade_atual + quantidade;
      await connection.execute(
        'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
        [novaQuantidadeDestino, loteDestino.id]
      );
      loteDestinoId = loteDestino.id;
    } else {
      // Cria novo lote na unidade de destino
      const [result] = await connection.execute(
        'INSERT INTO lotes (insumo_id, numero_lote, quantidade_inicial, quantidade_atual, data_validade, unidade_id) VALUES (?, ?, ?, ?, ?, ?)',
        [loteOrigem.insumo_id, loteOrigem.numero_lote, quantidade, quantidade, loteOrigem.data_validade, unidade_destino_id]
      );
      loteDestinoId = result.insertId;
    }

    // 4. Registra a movimentação de transferência
    await connection.execute(
      'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
      [lote_id, 'transferencia', quantidade, responsavel_id, unidade_origem_id, unidade_destino_id]
    );

    await connection.commit(); // Confirma a transação

    // Após a transferência bem-sucedida, verifica alertas em ambas as unidades
    await checkAndCreateAlerts(unidade_origem_id);
    await checkAndCreateAlerts(unidade_destino_id);

    res.json({ message: 'Transferência de lote registrada com sucesso.' });
  } catch (error) {
    await connection.rollback(); // Reverte a transação em caso de erro
    console.error('Erro ao transferir lote:', error);
    res.status(500).json({ message: 'Erro no servidor durante a transferência.' });
  } finally {
    connection.release(); // Libera a conexão
  }
});


module.exports = router;
