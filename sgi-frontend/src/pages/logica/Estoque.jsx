// Filename: EstoqueGeral.jsx
import React, { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import {
  FaSearch,
  FaSyncAlt,
  FaExclamationCircle,
} from "react-icons/fa";
import {
  StockPageContainer,
  Title,
  StockTableContainer,
  FilterGroup,
  Table,
  StatusIndicator,
  MessageContainer,
  NoDataMessage,
} from "../style/EstoqueStyles"; // Import styled components

const EstoqueGeral = () => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [unidades, setUnidades] = useState([]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  // For almoxarife_central, filterUnit can be any unit or empty for all.
  // For almoxarife_local, filterUnit is always their own unit.
  const [filterUnit, setFilterUnit] = useState(user?.unidade_id || "");

  const fetchInsumos = async () => {
    try {
      const response = await api.get("/insumos");
      setInsumos(response.data);
    } catch (error) {
      console.error("Error fetching insumos:", error);
      // No displayMessage here, as it's a background fetch
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get("/unidades");
      setUnidades(response.data);
    } catch (error) {
      console.error("Error fetching units:", error);
      // No displayMessage here, as it's a background fetch
    }
  };

  const fetchLotes = async (unitId) => {
    if (!user) return;

    let endpoint = "/lotes"; // Default for central or if no unit specified
    if (user.tipo_usuario === "almoxarife_local") {
      // Almoxarife local can only see their own unit's lots
      endpoint = `/lotes/${user.unidade_id}`;
    } else if (user.tipo_usuario === "almoxarife_central") {
      // Almoxarife central can see all or filter by unit
      if (unitId && unitId !== "all") {
        endpoint = `/lotes/${unitId}`;
      } else {
        // If "Todas as Unidades" is selected, the backend needs a route for all lots
        // Assuming backend /lotes (without ID) returns all for almoxarife_central
        // If not, this would need to iterate through units or have a dedicated backend route
        endpoint = `/lotes/all`; // Placeholder, assuming backend supports /lotes/all or similar
      }
    } else {
      // Other roles like gestor or profissional_saude shouldn't see this page based on requirements
      setLotes([]);
      return;
    }

    try {
      const response = await api.get(endpoint);
      setLotes(response.data);
    } catch (error) {
      console.error("Error fetching lotes:", error);
      // This page doesn't have a feedback message container, so log to console
    }
  };

  useEffect(() => {
    fetchInsumos();
    fetchUnits();
    if (user) {
      // Set initial filter unit based on user role
      if (user.tipo_usuario === "almoxarife_local") {
        setFilterUnit(user.unidade_id);
        fetchLotes(user.unidade_id);
      } else if (user.tipo_usuario === "almoxarife_central") {
        setFilterUnit(""); // Default to "Todas as Unidades" for central
        fetchLotes("all"); // Fetch all for central by default
      }
    }
  }, [user]);

  // Effect to re-fetch lots when filterUnit changes (only for almoxarife_central)
  useEffect(() => {
    if (user?.tipo_usuario === "almoxarife_central") {
      fetchLotes(filterUnit);
    }
  }, [filterUnit, user]);


  const getStatus = (lote) => {
    const isExpired = new Date(lote.data_validade) < new Date();
    if (isExpired) {
      return "Vencido";
    }
    if (lote.quantidade_atual < 20) { // Threshold for "Baixo" stock
      return "Baixo";
    }
    return "Ativo";
  };

  const filteredLotes = lotes.filter(
    (lote) =>
      lote.insumo_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lote.numero_lote.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Access restriction for 'gestor' and 'profissional_saude' users
  if (user?.tipo_usuario === "gestor" || user?.tipo_usuario === "profissional_saude") {
    return (
      <StockPageContainer>
        <MessageContainer type="error">
          <FaExclamationCircle /> Você não tem permissão para acessar esta
          página.
        </MessageContainer>
      </StockPageContainer>
    );
  }

  return (
    <StockPageContainer>
      <Title>Estoque Geral</Title>

      <StockTableContainer>
        <FilterGroup>
          <input
            type="text"
            placeholder="Buscar por insumo ou lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {user?.tipo_usuario === "almoxarife_central" && (
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
            >
              <option value="">Todas as Unidades</option>
              {unidades.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.nome}
                </option>
              ))}
            </select>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => fetchLotes(filterUnit)}
          >
            <FaSyncAlt /> Atualizar
          </button>
        </FilterGroup>
        <Table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Lote</th>
              <th>Quantidade Atual</th>
              <th>Data de Validade</th>
              <th>Unidade Medida</th>
              <th>Status</th>
              <th>Local de Armazenamento</th>
              {user?.tipo_usuario === "almoxarife_central" && <th>Unidade</th>}
            </tr>
          </thead>
          <tbody>
            {filteredLotes.length > 0 ? (
              filteredLotes.map((lote) => (
                <tr key={lote.id}>
                  <td>{lote.insumo_nome}</td>
                  <td>{lote.numero_lote}</td>
                  <td>{lote.quantidade_atual}</td>
                  <td>{new Date(lote.data_validade).toLocaleDateString()}</td>
                  <td>
                    {
                      insumos.find((i) => i.id === lote.insumo_id)
                        ?.unidade_medida
                    }
                  </td>
                  <td>
                    <StatusIndicator $statusType={getStatus(lote)}>
                      {getStatus(lote)}
                    </StatusIndicator>
                  </td>
                  <td>
                    {insumos.find((i) => i.id === lote.insumo_id)
                      ?.local_armazenamento || "N/A"}
                  </td>
                  {user?.tipo_usuario === "almoxarife_central" && (
                    <td>
                      {unidades.find((u) => u.id === lote.unidade_id)?.nome || "N/A"}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={user?.tipo_usuario === "almoxarife_central" ? "8" : "7"}>
                  <NoDataMessage>
                    Nenhum lote encontrado para esta unidade ou com os filtros
                    aplicados.
                  </NoDataMessage>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </StockTableContainer>
    </StockPageContainer>
  );
};

export default EstoqueGeral;
