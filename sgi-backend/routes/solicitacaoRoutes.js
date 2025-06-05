const express = require('express');
const { pool } = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Endpoint for submitting insumo requests
router.post('/', authenticateToken, authorizeRoles(['gerente_estoque']), async (req, res) => {
  const { insumo_id, quantidade } = req.body;
  const solicitante_id = req.user.userId; // Assuming req.user is populated by authenticateToken

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
    console.error('Error recording insumo request:', error);
    res.status(500).json({ message: 'Erro no servidor ao registrar solicitação de insumo.' });
  }
});

// You might also want endpoints to view all requests, update status, etc.
// router.get('/', authenticateToken, authorizeRoles(['estoquista', 'gerente_estoque']), async (req, res) => { ... });
// router.put('/:id/status', authenticateToken, authorizeRoles(['estoquista']), async (req, res) => { ... });


module.exports = router;