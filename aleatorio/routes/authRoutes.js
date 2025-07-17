const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database');
require('dotenv').config();

const router = express.Router();

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
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
      { userId: user.id, email: user.email, tipo_usuario: user.tipo_usuario, unidade_id: user.unidade_id }, // <-- MUDANÇA AQUI: 'id' para 'userId'
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: 'Logged in successfully', token, user: { id: user.id, nome: user.nome, email: user.email, tipo_usuario: user.tipo_usuario, unidade_id: user.unidade_id } });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;