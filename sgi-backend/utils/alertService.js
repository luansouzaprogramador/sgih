const moment = require('moment');
const { pool } = require('../database');

// Constante para o ID da unidade central (agora uma unidade própria)
const CENTRAL_UNIT_ID = 5; // ID da nova unidade 'Almoxarifado Central FHEMIG'

async function checkAndCreateAlerts(unidade_id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Buscar todos os lotes da unidade, incluindo o estoque_minimo do insumo associado
    const [lotes] = await connection.execute(
      'SELECT l.id, l.data_validade, l.quantidade_atual, l.status, l.insumo_id, i.nome AS insumo_nome, l.numero_lote, i.estoque_minimo FROM lotes l JOIN insumos i ON l.insumo_id = i.id WHERE l.unidade_id = ?',
      [unidade_id]
    );

    for (const lote of lotes) {
      const today = moment().startOf('day');
      const dataValidade = moment(lote.data_validade).startOf('day');

      // 1. Verificação de Vencimento
      if (dataValidade.isBefore(today)) { // Lote está vencido
        if (lote.status === 'ativo') {
          await connection.execute('UPDATE lotes SET status = "vencido" WHERE id = ?', [lote.id]);
        }
        // Cria ou reativa alerta de vencimento
        const [existingAlert] = await connection.execute(
          'SELECT id, status FROM alertas WHERE lote_id = ? AND tipo = "vencimento"',
          [lote.id]
        );
        if (existingAlert.length === 0) {
          await connection.execute(
            'INSERT INTO alertas (unidade_id, tipo, mensagem, insumo_id, lote_id, status) VALUES (?, ?, ?, ?, ?, ?)',
            [unidade_id, 'vencimento', `Lote ${lote.numero_lote} do insumo ${lote.insumo_nome} está vencido.`, lote.insumo_id, lote.id, 'ativo']
          );
        } else if (existingAlert[0].status === 'resolvido') {
          await connection.execute('UPDATE alertas SET status = "ativo" WHERE id = ?', [existingAlert[0].id]);
        }
      } else { // Lote não está vencido
        if (lote.status === 'vencido') { // Se estava vencido mas a data foi corrigida, reativar
          await connection.execute('UPDATE lotes SET status = "ativo" WHERE id = ?', [lote.id]);
        }
        // Resolve alerta de vencimento se existir e estiver ativo
        await connection.execute('UPDATE alertas SET status = "resolvido" WHERE lote_id = ? AND tipo = "vencimento" AND status = "ativo"', [lote.id]);
      }

      // 2. Verificação de Estoque Crítico (somente se não estiver vencido)
      // Usar o estoque_minimo do insumo como o limiar crítico
      const criticalThreshold = lote.estoque_minimo;
      if (lote.status !== 'vencido') {
        if (lote.quantidade_atual <= criticalThreshold) {
          // Cria ou reativa alerta de estoque crítico
          const [existingAlert] = await connection.execute(
            'SELECT id, status FROM alertas WHERE lote_id = ? AND tipo = "estoque_critico"',
            [lote.id]
          );
          if (existingAlert.length === 0) {
            await connection.execute(
              'INSERT INTO alertas (unidade_id, tipo, mensagem, insumo_id, lote_id, status) VALUES (?, ?, ?, ?, ?, ?)',
              [unidade_id, 'estoque_critico', `Estoque crítico para o insumo ${lote.insumo_nome} (Lote: ${lote.numero_lote}). Quantidade atual: ${lote.quantidade_atual}. Mínimo: ${criticalThreshold}.`, lote.insumo_id, lote.id, 'ativo']
            );
          } else if (existingAlert[0].status === 'resolvido') {
            await connection.execute('UPDATE alertas SET status = "ativo" WHERE id = ?', [existingAlert[0].id]);
          }
        } else {
          // Se a quantidade não é mais crítica, resolve o alerta
          await connection.execute('UPDATE alertas SET status = "resolvido" WHERE lote_id = ? AND tipo = "estoque_critico" AND status = "ativo"', [lote.id]);
        }
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao verificar e criar alertas:', error);
    // Não relançar o erro aqui para não interromper o fluxo principal da aplicação
  } finally {
    connection.release();
  }
}

module.exports = {
  checkAndCreateAlerts
};
