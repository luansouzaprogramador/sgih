const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM insumos');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching insumos:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Apenas 'almoxarife_central' pode criar insumos
router.post('/', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
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

// Apenas 'almoxarife_central' pode atualizar insumos
router.put('/:id', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
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

// Apenas 'almoxarife_central' pode excluir insumos
router.delete('/:id', authenticateToken, authorizeRoles(['almoxarife_central']), async (req, res) => {
  const { id } = req.params;

  try {
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

module.exports = router;