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
import Painel from "./pages/logica/Painel";
import Estoque from "./pages/logica/Estoque";
import EntradaInsumoLocal from "./pages/logica/EntradaInsumo"; // Renomeado para EntradaInsumoLocal
import SaidaInsumoLocal from "./pages/logica/SaidaInsumo"; // Renomeado para SaidaInsumoLocal
import Agendamentos from "./pages/logica/Agendamentos";
import Relatorios from "./pages/logica/Relatorios";
import Usuarios from "./pages/logica/Usuarios";
// import Insumos from "./pages/logica/Insumos"; // Removido o Insumos original
import Unidades from "./pages/logica/Unidades"; // Adicionado: Importação do componente Unidades

// NOVOS COMPONENTES PARA ALMOXARIFE CENTRAL E LOCAL
import EntradaInsumoCentral from "./pages/logica/EntradaInsumoCentral"; // Nova tela para Almoxarife Central
import SaidaInsumoCentral from "./pages/logica/SaidaInsumoCentral";   // Nova tela para Almoxarife Central
import SolicitacoesInsumoLocal from "./pages/logica/SolicitacoesInsumoLocal"; // Nova tela para Almoxarife Local fazer solicitações ao Central

// NOVOS COMPONENTES PARA GERENCIAMENTO E SOLICITAÇÃO DE INSUMOS
import GerenciarInsumos from "./pages/logica/GerenciarInsumos"; // Nova tela para Almoxarifes
import SolicitarInsumos from "./pages/logica/SolicitarInsumos"; // Nova tela para Gestores e Profissionais de Saúde

function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/painel" /> : <Login />}
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/painel" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Rotas Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/painel" element={<Painel />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/agendamentos" element={<Agendamentos />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/unidades" element={<Unidades />} /> {/* Gerenciar Unidades é para gestor */}
          <Route path="/usuarios" element={<Usuarios />} /> {/* Usuários é para gestor */}

          {/* Rotas Específicas para Almoxarife Local */}
          <Route path="/entrada-insumo-local" element={<EntradaInsumoLocal />} />
          <Route path="/saida-insumo-local" element={<SaidaInsumoLocal />} />
          <Route path="/solicitacoes-insumo-local" element={<SolicitacoesInsumoLocal />} />

          {/* Rotas Específicas para Almoxarife Central */}
          <Route path="/entrada-insumo-central" element={<EntradaInsumoCentral />} />
          <Route path="/saida-insumo-central" element={<SaidaInsumoCentral />} />

          {/* Novas Rotas para Gerenciar/Solicitar Insumos */}
          <Route path="/gerenciar-insumos" element={<GerenciarInsumos />} />
          <Route path="/solicitar-insumos" element={<SolicitarInsumos />} />

        </Route>

        {/* Catch-all para 404 */}
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
