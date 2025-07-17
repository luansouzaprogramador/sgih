import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/logica/Login";
import Dashboard from "./pages/logica/Dashboard";
import Estoque from "./pages/logica/Estoque";
import EntradaInsumoLocal from "./pages/logica/EntradaInsumo"; // Renomeado para EntradaInsumoLocal
import SaidaInsumoLocal from "./pages/logica/SaidaInsumo"; // Renomeado para SaidaInsumoLocal
import Agendamentos from "./pages/logica/Agendamentos";
import Relatorios from "./pages/logica/Relatorios";
import Configuracoes from "./pages/logica/Configuracoes";
import Insumos from "./pages/logica/Insumos"; // Para gerenciar definições de insumos (acessível a todos)
import Unidades from "./pages/logica/Unidades"; // Para gerenciar unidades hospitalares

// NOVOS COMPONENTES PARA ALMOXARIFE CENTRAL E LOCAL
import EntradaInsumoCentral from "./pages/logica/EntradaInsumoCentral"; // Nova tela para Almoxarife Central
import SaidaInsumoCentral from "./pages/logica/SaidaInsumoCentral";   // Nova tela para Almoxarife Central
import SolicitacoesInsumoLocal from "./pages/logica/SolicitacoesInsumoLocal"; // Nova tela para Almoxarife Local fazer solicitações ao Central

function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Rotas Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/agendamentos" element={<Agendamentos />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/insumos" element={<Insumos />} /> {/* Gerenciar Insumos é geral */}
          <Route path="/unidades" element={<Unidades />} /> {/* Gerenciar Unidades é para gestor */}
          <Route path="/configuracoes" element={<Configuracoes />} /> {/* Configurações é para gestor */}

          {/* Rotas Específicas para Almoxarife Local */}
          <Route path="/entrada-insumo-local" element={<EntradaInsumoLocal />} />
          <Route path="/saida-insumo-local" element={<SaidaInsumoLocal />} />
          <Route path="/solicitacoes-insumo-local" element={<SolicitacoesInsumoLocal />} />

          {/* Rotas Específicas para Almoxarife Central */}
          <Route path="/entrada-insumo-central" element={<EntradaInsumoCentral />} />
          <Route path="/saida-insumo-central" element={<SaidaInsumoCentral />} />
        </Route>

        {/* Catch-all para 404 */}
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
