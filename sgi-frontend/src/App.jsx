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
import Entrada from "./pages/logica/EntradaInsumo";
import Saida from "./pages/logica/SaidaInsumo";
import Agendamentos from "./pages/logica/Agendamentos";
import Relatorios from "./pages/logica/Relatorios";
import Configuracoes from "./pages/logica/Configuracoes";
import Insumos from "./pages/logica/Insumos"; // For managing insumo definitions
import Unidades from "./pages/logica/Unidades"; // For managing hospital units

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

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/entrada-insumo" element={<Entrada />} />
          <Route path="/saida-insumo" element={<Saida />} />
          <Route path="/agendamentos" element={<Agendamentos />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/insumos" element={<Insumos />} />
          <Route path="/unidades" element={<Unidades />} />
          {/* Configuration and User Management for Managers only */}
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>

        {/* Catch-all for 404 */}
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;