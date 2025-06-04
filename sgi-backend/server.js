const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, testConnection } = require('./database');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');
require('dotenv').config();
const moment = require('moment'); // Adicionado para manipulação de datas

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Test DB connection on startup
testConnection();

// Função para verificar o status dos lotes e criar/atualizar alertas
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
        const criticalThreshold = 10; // Limite de estoque crítico
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


// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha, tipo_usuario, unidade_id } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(senha, 10);
    const [result] = await pool.execute(
      'INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES (?, ?, ?, ?, ?)',
      [nome, email, hashedPassword, tipo_usuario, unidade_id]
    );
    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, tipo_usuario: user.tipo_usuario, unidade_id: user.unidade_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: 'Logged in successfully', token, user: { id: user.id, nome: user.nome, email: user.email, tipo_usuario: user.tipo_usuario, unidade_id: user.unidade_id } });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// --- USER MANAGEMENT ROUTES (NEW) ---
app.get('/api/users', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, nome, email, tipo_usuario, unidade_id FROM usuarios');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

app.put('/api/users/:id', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  const { id } = req.params;
  const { nome, email, tipo_usuario, unidade_id } = req.body;
  try {
    const [result] = await pool.execute(
      'UPDATE usuarios SET nome = ?, email = ?, tipo_usuario = ?, unidade_id = ? WHERE id = ?',
      [nome, email, tipo_usuario, unidade_id, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ message: 'User updated successfully.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already in use by another user.' });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error updating user.' });
  }
});

app.delete('/api/users/:id', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

// --- UNIDADES HOSPITALARES ROUTES ---
app.get('/api/unidades', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM unidades_hospitalares');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/unidades', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  const { nome, endereco, telefone, email } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO unidades_hospitalares (nome, endereco, telefone, email) VALUES (?, ?, ?, ?)',
      [nome, endereco, telefone, email]
    );
    res.status(201).json({ message: 'Unit created successfully', unitId: result.insertId });
  } catch (error) {
    console.error('Error creating unit:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Atualizar unidade (PUT)
app.put('/api/unidades/:id', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  const { id } = req.params;
  const { nome, endereco, telefone, email } = req.body;

  try {
    const [result] = await pool.execute(
      'UPDATE unidades_hospitalares SET nome = ?, endereco = ?, telefone = ?, email = ? WHERE id = ?',
      [nome, endereco, telefone, email, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Unidade não encontrada.' });
    }

    res.json({ message: 'Unidade atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar unidade:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar unidade.' });
  }
});

// Excluir unidade (DELETE)
app.delete('/api/unidades/:id', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  const { id } = req.params;

  try {
    // Verifique se a unidade está sendo usada em outras tabelas antes de deletar
    const [checkUsage] = await pool.execute(
      'SELECT COUNT(*) AS count FROM usuarios WHERE unidade_id = ?',
      [id]
    );

    if (checkUsage[0].count > 0) {
      return res.status(400).json({
        message: 'Não é possível excluir. Esta unidade está vinculada a usuários.'
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM unidades_hospitalares WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Unidade não encontrada.' });
    }

    res.json({ message: 'Unidade excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir unidade:', error);
    res.status(500).json({ message: 'Erro no servidor ao excluir unidade.' });
  }
});

// --- INSUMOS ROUTES ---
app.get('/api/insumos', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM insumos');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching insumos:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/insumos', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  const { nome, descricao, unidade_medida, local_armazenamento } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES (?, ?, ?, ?)',
      [nome, descricao, unidade_medida, local_armazenamento]
    );
    res.status(201).json({ message: 'Insumo created successfully', insumoId: result.insertId });
  } catch (error) {
    console.error('Error creating insumo:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Atualizar insumo (PUT)
app.put('/api/insumos/:id', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, unidade_medida, local_armazenamento } = req.body;

  try {
    const [result] = await pool.execute(
      'UPDATE insumos SET nome = ?, descricao = ?, unidade_medida = ?, local_armazenamento = ? WHERE id = ?',
      [nome, descricao, unidade_medida, local_armazenamento, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Insumo não encontrado.' });
    }

    res.json({ message: 'Insumo atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar insumo:', error);
    res.status(500).json({ message: 'Erro no servidor ao atualizar insumo.' });
  }
});

// Excluir insumo (DELETE)
app.delete('/api/insumos/:id', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar se o insumo está sendo usado em lotes antes de deletar
    const [checkUsage] = await pool.execute(
      'SELECT COUNT(*) AS count FROM lotes WHERE insumo_id = ?',
      [id]
    );

    if (checkUsage[0].count > 0) {
      return res.status(400).json({
        message: 'Não é possível excluir. Este insumo está vinculado a lotes.'
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM insumos WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Insumo não encontrado.' });
    }

    res.json({ message: 'Insumo excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir insumo:', error);
    res.status(500).json({ message: 'Erro no servidor ao excluir insumo.' });
  }
});

// --- LOTES (BATCHES) ROUTES ---
// Get batches for a specific unit
app.get('/api/lotes/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  try {
    if (req.user.tipo_usuario === 'estoquista' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Access denied.');
    }

    // Executa a verificação e criação de alertas antes de retornar os lotes
    await checkAndCreateAlerts(unidadeId);

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

// Add a new batch (entrada de insumo)
app.post('/api/lotes/entrada', authenticateToken, authorizeRoles(['estoquista', 'gerente_estoque']), async (req, res) => {
  const { insumo_id, numero_lote, data_validade, quantidade, unidade_id } = req.body;
  const responsavel_id = req.user.id;

  try {
    const [result] = await pool.execute(
      'INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, unidade_id) VALUES (?, ?, ?, ?, ?, ?)',
      [insumo_id, numero_lote, data_validade, quantidade, quantidade, unidade_id]
    );
    const loteId = result.insertId;

    await pool.execute(
      'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id) VALUES (?, ?, ?, ?, ?)',
      [loteId, 'entrada', quantidade, responsavel_id, unidade_id]
    );

    // Executa a verificação e criação de alertas após a entrada do lote
    await checkAndCreateAlerts(unidade_id);

    res.status(201).json({ message: 'Batch added and movement registered successfully', loteId });
  } catch (error) {
    console.error('Error adding batch:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Update batch quantity / register exit (REQ01, RN02)
app.post('/api/lotes/saida', authenticateToken, authorizeRoles(['estoquista', 'gerente_estoque']), async (req, res) => {
  const { lote_id, quantidade_saida, unidade_origem_id } = req.body;
  const responsavel_id = req.user.id;

  try {
    const [loteRows] = await pool.execute('SELECT * FROM lotes WHERE id = ? AND unidade_id = ?', [lote_id, unidade_origem_id]);
    const lote = loteRows[0];

    if (!lote) {
      return res.status(404).json({ message: 'Batch not found in this unit.' });
    }

    // RN06: Não permitir uso de material vencido ou bloqueado
    if (moment(lote.data_validade).startOf('day').isBefore(moment().startOf('day'))) {
      return res.status(400).json({ message: 'Cannot use expired material.' });
    }
    if (lote.status === 'bloqueado') {
      return res.status(400).json({ message: 'Cannot use blocked material.' });
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

    // Executa a verificação e criação de alertas após a saída do lote
    await checkAndCreateAlerts(unidade_origem_id);

    res.json({ message: 'Supply quantity updated and movement registered successfully', novaQuantidade });
  } catch (error) {
    console.error('Error updating batch quantity:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// --- MOVIMENTACOES ROUTES (Movement History) ---
app.get('/api/movimentacoes/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  const { insumoId, periodo } = req.query; // For filtering (Módulo Relatórios)
  try {
    if (req.user.tipo_usuario === 'estoquista' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Access denied.');
    }
    let query = `
      SELECT m.*, i.nome AS insumo_nome, l.numero_lote, u.nome AS responsavel_nome
      FROM movimentacoes m
      JOIN lotes l ON m.lote_id = l.id
      JOIN insumos i ON l.insumo_id = i.id
      JOIN usuarios u ON m.responsavel_id = u.id
      WHERE m.unidade_origem_id = ?
    `;
    let params = [unidadeId];
    if (insumoId) {
      query += ` AND l.insumo_id = ?`;
      params.push(insumoId);
    }
    if (periodo) {
      const days = parseInt(periodo);
      if (!isNaN(days) && days > 0) {
        query += ` AND m.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
        params.push(days);
      }
    }
    query += ` ORDER BY m.data_hora DESC`;
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching movements:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// --- AGENDAMENTOS (DELIVERIES/SCHEDULES) ROUTES ---
app.get('/api/agendamentos{/:unidadeId}', authenticateToken, async (req, res) => {
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
    if (req.user.tipo_usuario === 'estoquista') {
      query += ` WHERE a.unidade_origem_id = ? OR a.unidade_destino_id = ?`;
      params.push(req.user.unidade_id, req.user.unidade_id);
    } else if (unidadeId) {
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

app.post('/api/agendamentos', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  const {
    unidade_origem_id,
    unidade_destino_id,
    data_agendamento,
    observacao,
    itens, // Array of { lote_id, quantidade }
  } = req.body;
  const responsavel_agendamento_id = req.user.id;

  const connection = await pool.getConnection(); // Use a connection for transaction
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

      // Deduct quantity from origin unit's stock
      await connection.execute(
        'UPDATE lotes SET quantidade_atual = quantidade_atual - ? WHERE id = ?',
        [item.quantidade, item.lote_id]
      );

      // Record movement for the origin unit as 'transferencia'
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

app.post('/api/agendamentos/:id/concluir', authenticateToken, authorizeRoles(['estoquista', 'gerente_estoque']), async (req, res) => {
  const { id } = req.params;
  const responsavel_id = req.user.id;
  const unidade_destino_id = req.user.unidade_id; // The unit that is receiving the delivery

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

    // Get all items associated with this agendamento
    const [itens] = await connection.execute('SELECT lote_id, quantidade FROM agendamento_itens WHERE agendamento_id = ?', [id]);

    for (const item of itens) {
      // Add quantity to destination unit's stock
      // Check if lote exists in destination unit, if not, create it
      const [loteDestinoRows] = await connection.execute('SELECT * FROM lotes WHERE id = ? AND unidade_id = ?', [item.lote_id, unidade_destino_id]);
      let loteDestino = loteDestinoRows[0];

      if (loteDestino) {
        // Lote exists in destination unit, update quantity
        await connection.execute(
          'UPDATE lotes SET quantidade_atual = quantidade_atual + ? WHERE id = ?',
          [item.quantidade, item.lote_id]
        );
      } else {
        // Lote does not exist in destination unit, fetch original lote details and create new one
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

      // Record movement for the destination unit as 'entrada'
      await connection.execute(
        'INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, unidade_destino_id) VALUES (?, ?, ?, ?, ?, ?)',
        [item.lote_id, 'entrada', item.quantidade, responsavel_id, agendamento.unidade_origem_id, unidade_destino_id]
      );
    }

    // Update agendamento status
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


// --- ALERTS ROUTES ---
app.get('/api/alertas/:unidadeId', authenticateToken, async (req, res) => {
  const { unidadeId } = req.params;
  try {
    // Optional: Add authorization check if only certain roles can view alerts for a unit
    if (req.user.tipo_usuario === 'estoquista' && req.user.unidade_id != unidadeId) {
      return res.status(403).send('Access denied.');
    }

    const [rows] = await pool.execute(
      `SELECT a.*, i.nome AS insumo_nome, l.numero_lote
       FROM alertas a
       LEFT JOIN insumos i ON a.insumo_id = i.id
       LEFT JOIN lotes l ON a.lote_id = l.id
       WHERE a.unidade_id = ? AND a.status = 'ativo'
       ORDER BY a.data_alerta DESC`,
      [unidadeId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Server error fetching alerts.' });
  }
});

// --- REPORT GENERATION (Conceptual) ---
app.get('/api/relatorios/estoque-critico', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
            SELECT l.id AS lote_id, i.nome AS insumo_nome, l.quantidade_atual, uh.nome AS unidade_nome
            FROM lotes l
            JOIN insumos i ON l.insumo_id = i.id
            JOIN unidades_hospitalares uh ON l.unidade_id = uh.id
            WHERE l.quantidade_atual < 10 AND l.status = 'ativo'
            ORDER BY uh.nome, i.nome
        `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching critical stock report:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});