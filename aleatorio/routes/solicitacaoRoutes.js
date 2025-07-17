const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const moment = require('moment'); // Para comparações de data

const router = express.Router();

// Endpoint para submeter solicitações de insumo
router.post('/', authenticateToken, authorizeRoles(['gestor', 'profissional_saude']), async (req, res) => {
  const { insumo_id, quantidade } = req.body;
  const solicitante_id = req.user.userId;

  if (!insumo_id || !quantidade) {
    return res.status(400).json({ message: 'Insumo ID e quantidade são obrigatórios.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO solicitacoes_insumo (insumo_id, quantidade, solicitante_id) VALUES (?, ?, ?)',
      [insumo_id, quantidade, solicitante_id]
    );
    res.status(201).json({ message: 'Solicitação de insumo registrada com sucesso!', solicitacaoId: result.insertId });
  } catch (error) {
    console.error('Erro ao registrar solicitação de insumo:', error);
    res.status(500).json({ message: 'Erro no servidor ao registrar solicitação de insumo.' });
  }
});

// Obter todas as solicitações de insumo com filtragem baseada na função do usuário e status
router.get('/', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local', 'gestor', 'profissional_saude']), async (req, res) => {
  const userRole = req.user.tipo_usuario;
  const userId = req.user.userId;
  const userUnidadeId = req.user.unidade_id;
  const { status } = req.query; // Obter filtro de status dos parâmetros de consulta

  try {
    let query = `
      SELECT
        si.id,
        si.quantidade,
        si.status,
        si.data_solicitacao,
        si.data_atualizacao,
        i.nome AS insumo_nome,
        i.unidade_medida,
        u.nome AS solicitante_nome,
        uh.nome AS unidade_solicitante_nome,
        uh.id AS unidade_solicitante_id
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      JOIN usuarios u ON si.solicitante_id = u.id
      JOIN unidades_hospitalares uh ON u.unidade_id = uh.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'gestor' || userRole === 'profissional_saude') {
      // Gestor e profissional_saude veem apenas suas próprias solicitações
      query += ' AND si.solicitante_id = ?';
      params.push(userId);
    } else if (userRole === 'almoxarife_local') {
      // Almoxarife_local vê solicitações de sua própria unidade
      query += ' AND uh.id = ?';
      params.push(userUnidadeId);
    }
    // Almoxarife_central obtém todas as solicitações (sem cláusula WHERE adicional baseada em unidade/usuário)

    // Adiciona filtro de status se fornecido
    if (status) {
      query += ' AND si.status = ?';
      params.push(status);
    }

    query += ' ORDER BY si.data_solicitacao DESC';

    const [rows] = await pool.execute(query, params);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao carregar solicitações de insumo:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar solicitações de insumo.' });
  }
});

// Atualizar status da solicitação (para rejeição por almoxarife_local, ou central se necessário para outros status)
router.put('/:id/status', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Valores esperados: 'rejeitada'

  if (!['rejeitada'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido para esta rota. Apenas "rejeitada" é permitido.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE solicitacoes_insumo SET status = ?, data_atualizacao = NOW() WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    res.json({ message: `Status da solicitação ${id} atualizado para ${status} com sucesso.` });
  } catch (error) {
    console.error('Erro ao atualizar status da solicitação:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar status da solicitação.' });
  }
});

// Nova rota para aprovar uma solicitação e deduzir estoque - Apenas Almoxarife Local
router.put('/:id/aprovar', authenticateToken, authorizeRoles(['almoxarife_local']), async (req, res) => {
  const solicitacaoId = req.params.id;
  const responsavel_id = req.user.userId;
  const almoxarifeUnidadeId = req.user.unidade_id;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Inicia a transação para atomicidade

    // 1. Buscar detalhes da solicitação
    const [solicitacaoRows] = await connection.execute(
      `SELECT si.id, si.insumo_id, si.quantidade, u.unidade_id AS unidade_solicitante_id, si.status
       FROM solicitacoes_insumo si
       JOIN usuarios u ON si.solicitante_id = u.id
       WHERE si.id = ?`,
      [solicitacaoId]
    );

    const solicitacao = solicitacaoRows[0];

    if (!solicitacao) {
      await connection.rollback();
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    if (solicitacao.status !== 'pendente') {
      await connection.rollback();
      return res.status(400).json({ message: `Solicitação já foi ${solicitacao.status}.` });
    }

    // 2. Verificar se a solicitação pertence à unidade do almoxarife_local
    if (solicitacao.unidade_solicitante_id !== almoxarifeUnidadeId) {
      await connection.rollback();
      return res.status(403).json({ message: 'Acesso negado: Esta solicitação não pertence à sua unidade.' });
    }

    const { insumo_id, quantidade: quantidadeSolicitada, unidade_solicitante_id } = solicitacao;

    // 3. Encontrar lotes ativos adequados para insumo_id na unidade_solicitante_id
    // Prioriza lotes não vencidos, depois pela data de validade mais antiga (tipo FIFO)
    const [lotesDisponiveis] = await connection.execute(
      `SELECT id, quantidade_atual, data_validade
       FROM lotes
       WHERE insumo_id = ? AND unidade_id = ? AND quantidade_atual > 0 AND status = 'ativo'
       ORDER BY data_validade ASC`, // Ordenar do mais antigo primeiro
      [insumo_id, unidade_solicitante_id]
    );

    let quantidadeRestante = quantidadeSolicitada;
    const movimentacoesParaRegistrar = [];

    for (const lote of lotesDisponiveis) {
      // Verificar se o lote está vencido
      if (moment(lote.data_validade).startOf('day').isBefore(moment().startOf('day'))) {
        // Pular lotes vencidos para atender novas solicitações
        continue;
      }

      if (quantidadeRestante <= 0) break; // Toda a quantidade foi atendida

      const quantidadeDoLote = lote.quantidade_atual;
      const quantidadeATirar = Math.min(quantidadeRestante, quantidadeDoLote);

      // Deduzir quantidade do lote
      const novaQuantidadeLote = quantidadeDoLote - quantidadeATirar;
      await connection.execute(
        'UPDATE lotes SET quantidade_atual = ? WHERE id = ?',
        [novaQuantidadeLote, lote.id]
      );

      // Registrar movimentação para esta dedução de lote específica
      movimentacoesParaRegistrar.push({
        lote_id: lote.id,
        quantidade: quantidadeATirar,
      });

      quantidadeRestante -= quantidadeATirar;
    }

    if (quantidadeRestante > 0) {
      await connection.rollback();
      return res.status(400).json({ message: `Quantidade insuficiente em estoque para o insumo solicitado. Faltam ${quantidadeRestante} unidades.` });
    }

    // 4. Inserir movimentação(ões)
    for (const mov of movimentacoesParaRegistrar) {
      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
        [mov.lote_id, 'saida', mov.quantidade, responsavel_id, unidade_solicitante_id]
      );
    }

    // 5. Atualizar status de solicitacoes_insumo para 'concluida'
    await connection.execute(
      'UPDATE solicitacoes_insumo SET status = ?, data_atualizacao = NOW() WHERE id = ?',
      ['concluida', solicitacaoId]
    );

    await connection.commit(); // Confirma a transação
    res.json({ message: 'Solicitação aprovada e estoque atualizado com sucesso!' });

  } catch (error) {
    if (connection) await connection.rollback(); // Reverte em caso de erro
    console.error('Erro ao aprovar solicitação e dar baixa no estoque:', error);
    res.status(500).json({ message: 'Erro no servidor ao processar aprovação da solicitação.' });
  } finally {
    if (connection) connection.release();
  }
});


// Rota existente para obter solicitação de insumo por ID (opcional, mas bom para visualização detalhada)
router.get('/:id', authenticateToken, authorizeRoles(['almoxarife_central', 'almoxarife_local', 'gestor', 'profissional_saude']), async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.userId;
  const userRole = req.user.tipo_usuario;

  try {
    let query = `
      SELECT
        si.id,
        si.quantidade,
        si.status,
        si.data_solicitacao,
        si.data_atualizacao,
        i.nome AS insumo_nome,
        i.unidade_medida,
        u.nome AS solicitante_nome,
        uh.nome AS unidade_solicitante_nome,
        uh.id AS unidade_solicitante_id
      FROM solicitacoes_insumo si
      JOIN insumos i ON si.insumo_id = i.id
      JOIN usuarios u ON si.solicitante_id = u.id
      JOIN unidades_hospitalares uh ON u.unidade_id = uh.id
      WHERE si.id = ?
    `;
    const params = [requestId];

    // Restringir acesso para gestor/profissional_saude apenas às suas próprias solicitações
    if (userRole === 'gestor' || userRole === 'profissional_saude') {
      query += ' AND si.solicitante_id = ?';
      params.push(userId);
    }
    // Para almoxarife_local, restringir às solicitações de sua unidade
    else if (userRole === 'almoxarife_local') {
      query += ' AND uh.id = ?';
      params.push(req.user.unidade_id);
    }
    // Almoxarife_central pode ver qualquer solicitação por ID

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Solicitação não encontrada ou você não tem permissão para vê-la.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar solicitação de insumo única:', error);
    res.status(500).json({ message: 'Erro no servidor ao buscar solicitação de insumo.' });
  }
});

module.exports = router;
