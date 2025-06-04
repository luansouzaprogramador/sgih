const moment = require('moment');
const { pool } = require('../database');

async function checkAndCreateAlerts(unidade_id) {
  try {
    const [lotes] = await pool.execute(
      'SELECT l.id, l.data_validade, l.quantidade_atual, l.status, l.insumo_id, i.nome AS insumo_nome, l.numero_lote FROM lotes l JOIN insumos i ON l.insumo_id = i.id WHERE l.unidade_id = ?',
      [unidade_id]
    );

    for (const lote of lotes) {
      const today = moment().startOf('day');
      const dataValidade = moment(lote.data_validade).startOf('day');

      // 1. Verificação de Vencimento
      if (dataValidade.isBefore(today)) { // Lote está vencido 
        if (lote.status === 'ativo') {
          await pool.execute('UPDATE lotes SET status = "vencido" WHERE id = ?', [lote.id]);
        }
        // Cria ou reativa alerta de vencimento
        const [existingAlert] = await pool.execute(
          'SELECT id, status FROM alertas WHERE lote_id = ? AND tipo = "vencimento"',
          [lote.id]
        );
        if (existingAlert.length === 0) {
          await pool.execute(
            'INSERT INTO alertas (unidade_id, tipo, mensagem, insumo_id, lote_id, status) VALUES (?, ?, ?, ?, ?, ?)',
            [unidade_id, 'vencimento', `Lote ${lote.numero_lote} do insumo ${lote.insumo_nome} está vencido.`, lote.insumo_id, lote.id, 'ativo']
          );
        } else if (existingAlert[0].status === 'resolvido') {
          await pool.execute('UPDATE alertas SET status = "ativo" WHERE id = ?', [existingAlert[0].id]);
        }
      } else { // Lote não está vencido
        if (lote.status === 'vencido') { // Se estava vencido mas a data foi corrigida, reativar 
          await pool.execute('UPDATE lotes SET status = "ativo" WHERE id = ?', [lote.id]);
        }
        // Resolve alerta de vencimento se existir e estiver ativo
        await pool.execute('UPDATE alertas SET status = "resolvido" WHERE lote_id = ? AND tipo = "vencimento" AND status = "ativo"', [lote.id]);
      }

      // 2. Verificação de Estoque Crítico (somente se não estiver vencido ou bloqueado)
      if (lote.status !== 'vencido' && lote.status !== 'bloqueado') {
        const criticalThreshold = 10;
        if (lote.quantidade_atual < criticalThreshold) {
          // Cria ou reativa alerta de estoque crítico
          const [existingAlert] = await pool.execute(
            'SELECT id, status FROM alertas WHERE lote_id = ? AND tipo = "estoque_critico"',
            [lote.id]
          );
          if (existingAlert.length === 0) {
            await pool.execute(
              'INSERT INTO alertas (unidade_id, tipo, mensagem, insumo_id, lote_id, status) VALUES (?, ?, ?, ?, ?, ?)',
              [unidade_id, 'estoque_critico', `Estoque crítico para o insumo ${lote.insumo_nome} (Lote: ${lote.numero_lote}). Quantidade atual: ${lote.quantidade_atual}.`, lote.insumo_id, lote.id, 'ativo']
            );
          } else if (existingAlert[0].status === 'resolvido') {
            await pool.execute('UPDATE alertas SET status = "ativo" WHERE id = ?', [existingAlert[0].id]);
          }
        } else {
          // Se a quantidade não é mais crítica, resolve o alerta
          await pool.execute('UPDATE alertas SET status = "resolvido" WHERE lote_id = ? AND tipo = "estoque_critico" AND status = "ativo"', [lote.id]);
        }
      }
    }
  } catch (error) {
    console.error('Error checking and creating alerts:', error);
  }
}

module.exports = {
  checkAndCreateAlerts
};