const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { testConnection } = require('./database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const unidadeRoutes = require('./routes/unitRoutes');
const insumoRoutes = require('./routes/insumoRoutes');
const loteRoutes = require('./routes/loteRoutes');
const movimentacaoRoutes = require('./routes/movimentacaoRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const alertRoutes = require('./routes/alertRoutes');
const reportRoutes = require('./routes/reportRoutes');
const solicitacaoRoutes = require('./routes/solicitacaoRoutes'); // <--- NEW

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Test DB connection on startup
testConnection();

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/unidades', unidadeRoutes);
app.use('/api/insumos', insumoRoutes);
app.use('/api/lotes', loteRoutes);
app.use('/api/movimentacoes', movimentacaoRoutes);
app.use('/api/agendamentos', agendamentoRoutes); // Already present and correct
app.use('/api/alertas', alertRoutes);
app.use('/api/relatorios', reportRoutes);
app.use('/api/solicitacoes_insumo', solicitacaoRoutes); // <--- NEW
app.use('/api/solicitacoes', solicitacaoRoutes); // <--- LINHA ADICIONADA/CORRIGIDA


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});