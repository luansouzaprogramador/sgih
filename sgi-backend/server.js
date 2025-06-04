const express = require('express');
const cors = require('cors');
const { testConnection } = require('./database');
require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const unitRoutes = require('./routes/unitRoutes');
const insumoRoutes = require('./routes/insumoRoutes');
const loteRoutes = require('./routes/loteRoutes');
const movimentacaoRoutes = require('./routes/movimentacaoRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const alertRoutes = require('./routes/alertRoutes');
const reportRoutes = require('./routes/reportRoutes'); // If you add report routes

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Test DB connection on startup
testConnection();

// Use the imported routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/unidades', unitRoutes);
app.use('/api/insumos', insumoRoutes);
app.use('/api/lotes', loteRoutes);
app.use('/api/movimentacoes', movimentacaoRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/alertas', alertRoutes);
app.use('/api/relatorios', reportRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});