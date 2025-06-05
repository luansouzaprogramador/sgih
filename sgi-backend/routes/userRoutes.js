const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, authorizeRoles(['gestor']), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, nome, email, tipo_usuario, unidade_id FROM usuarios');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

router.put('/:id', authenticateToken, authorizeRoles(['gestor']), async (req, res) => {
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

router.delete('/:id', authenticateToken, authorizeRoles(['gestor']), async (req, res) => {
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

module.exports = router;