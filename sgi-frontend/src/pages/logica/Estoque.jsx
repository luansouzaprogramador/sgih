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

// Constante para o ID da unidade central (agora uma unidade própria)
const CENTRAL_UNIT_ID = 5; // ID da nova unidade 'Almoxarifado Central FHEMIG'

const EstoqueGeral = () => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [unidades, setUnidades] = useState([]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  // Para almoxarife_central, filterUnit pode ser qualquer unidade ou 'all' para todas.
  // Para almoxarife_local, filterUnit é sempre a sua própria unidade.
  const [filterUnit, setFilterUnit] = useState(user?.unidade_id || "");

  const fetchInsumos = async () => {
    try {
      const response = await api.get("/insumos");
      setInsumos(response.data);
    } catch (error) {
      console.error("Error fetching insumos:", error);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get("/unidades");
      setUnidades(response.data);
    } catch (error) {
      console.error("Error fetching units:", error);
    }
  };

  const fetchLotes = async (unitId) => {
    if (!user) return;

    let endpoint;
    let unitToFetch = unitId;

    if (user.tipo_usuario === "almoxarife_local") {
      unitToFetch = user.unidade_id; // Almoxarife local sempre vê sua própria unidade
      endpoint = `/lotes/${unitToFetch}`;
    } else if (user.tipo_usuario === "almoxarife_central") {
      if (unitId === "all") {
        // Almoxarife central pode ver todos os lotes de todas as unidades
        endpoint = null; // Indicar que faremos múltiplos fetches
      } else {
        // Almoxarife central pode ver o estoque de uma unidade específica (incluindo o central)
        endpoint = `/lotes/${unitToFetch}`;
      }
    } else {
      // Outros tipos de usuário não devem acessar esta página, mas para segurança
      return;
    }

    try {
      let responseData = [];
      if (user.tipo_usuario === "almoxarife_central" && unitId === "all") {
        const allUnits = await api.get("/unidades");
        const lotesPromises = allUnits.data.map(unit => api.get(`/lotes/${unit.id}`));
        const allLotesResponses = await Promise.all(lotesPromises);
        allLotesResponses.forEach(res => {
          responseData = [...responseData, ...res.data];
        });
      } else if (endpoint) {
        const response = await api.get(endpoint);
        responseData = response.data;
      }
      setLotes(responseData);
    } catch (error) {
      console.error("Error fetching lotes:", error);
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
        // Almoxarife central inicia mostrando o estoque central por padrão (sua própria unidade_id)
        setFilterUnit(user.unidade_id);
        fetchLotes(user.unidade_id);
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
    // Use lote.estoque_minimo for "Baixo" stock status
    if (lote.quantidade_atual <= lote.estoque_minimo) {
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
              {/* Agora o Almoxarifado Central é uma unidade na lista */}
              <option value={user.unidade_id}>Estoque Central</option>
              <option value="all">Todas as Unidades</option>
              {unidades.filter(unit => unit.id !== user.unidade_id).map((unit) => (
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
