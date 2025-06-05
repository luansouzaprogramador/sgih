const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM unidades_hospitalares');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/', authenticateToken, authorizeRoles(['gestor']), async (req, res) => {
  const { nome, endereco, telefone, email } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO unidades_hospitalares (nome, endereco, telefone, email) VALUES (?, ?, ?, ?)',
      [nome, endereco, telefone, email]
    );
    res.status(201).json({ message: 'Unit created successfully', unitId: result.insertId })
  } catch (error) {
    console.error('Error creating unit:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.put('/:id', authenticateToken, authorizeRoles(['gestor']), async (req, res) => {
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

router.delete('/:id', authenticateToken, authorizeRoles(['gestor']), async (req, res) => {
  const { id } = req.params;

  try {
    // Check for associated users
    const [checkUserUsage] = await pool.execute(
      'SELECT COUNT(*) AS count FROM usuarios WHERE unidade_id = ?',
      [id]
    );

    if (checkUserUsage[0].count > 0) {
      return res.status(400).json({
        message: 'Não é possível excluir. Esta unidade está vinculada a usuários.'
      });
    }

    // Check for associated lots
    const [checkLoteUsage] = await pool.execute(
      'SELECT COUNT(*) AS count FROM lotes WHERE unidade_id = ?',
      [id]
    );

    if (checkLoteUsage[0].count > 0) {
      return res.status(400).json({
        message: 'Não é possível excluir. Esta unidade está vinculada a lotes.'
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

module.exports = router;