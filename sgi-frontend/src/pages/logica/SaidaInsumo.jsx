import React, { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaSyncAlt,
  FaInfoCircle, // Adicionei FaInfoCircle aqui, pois ele é usado mas não importado
} from "react-icons/fa";
import {
  StockPageContainer, // Reusing container styles
  Title,
  ActionCard, // Alterado de 'Card' para 'ActionCard'
  Table, // Reusing Table style from DashboardStyles
  NoDataMessage,
  MessageContainer,
  FilterGroup, // Reusing FilterGroup
} from "../style/EstoqueStyles"; // Import styled components

const SaidaInsumo = () => {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // 'success', 'error', 'info'
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pendente"); // Default filter

  const displayMessage = (message, type) => {
    setFeedbackMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setFeedbackMessage(null);
      setMessageType(null);
    }, 5000); // Message disappears after 5 seconds
  };

  const fetchSolicitacoes = async () => {
    if (!user || user.tipo_usuario !== "almoxarife_local") {
      setSolicitacoes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Almoxarife local fetches requests for their unit
      const response = await api.get(`/solicitacoes?status=${filterStatus}`);
      // Filter client-side to ensure only requests for the local almoxarife's unit are shown
      // The backend route already filters by unit for almoxarife_local, but this is an extra safeguard.
      const filteredByUnit = response.data.filter(
        (sol) => sol.unidade_solicitante_id === user.unidade_id
      );
      setSolicitacoes(filteredByUnit);
    } catch (error) {
      console.error("Error fetching solicitations:", error);
      displayMessage("Erro ao carregar solicitações de insumo.", "error");
      setSolicitacoes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitacoes();
  }, [user, filterStatus]); // Re-fetch when user or filterStatus changes

  const handleApproveSolicitation = async (solicitacaoId) => {
    try {
      // Call the new backend endpoint for approval which also handles stock deduction
      await api.put(`/solicitacoes/${solicitacaoId}/aprovar`);
      displayMessage("Solicitação aprovada e estoque atualizado!", "success");
      fetchSolicitacoes(); // Refresh list
    } catch (error) {
      console.error("Error approving solicitation:", error);
      displayMessage(
        `Erro ao aprovar solicitação: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const handleRejectSolicitation = async (solicitacaoId) => {
    try {
      await api.put(`/solicitacoes/${solicitacaoId}/status`, {
        status: "rejeitada",
      });
      displayMessage("Solicitação rejeitada com sucesso!", "info");
      fetchSolicitacoes(); // Refresh list
    } catch (error) {
      console.error("Error rejecting solicitation:", error);
      displayMessage(
        `Erro ao rejeitar solicitação: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  // Access restriction: Only almoxarife_local can access this page
  if (user?.tipo_usuario !== "almoxarife_local") {
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
      <Title>Registrar Saída de Insumo (Solicitações)</Title>

      {feedbackMessage && (
        <MessageContainer type={messageType}>
          {messageType === "success" && <FaCheckCircle />}
          {messageType === "error" && <FaExclamationCircle />}
          {messageType === "info" && <FaInfoCircle />}
          {feedbackMessage}
        </MessageContainer>
      )}

      <ActionCard> {/* Alterado de 'Card' para 'ActionCard' */}
        <FilterGroup>
          <label htmlFor="statusFilter">Filtrar por Status:</label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="pendente">Pendentes</option>
            <option value="aprovada">Aprovadas</option>
            <option value="rejeitada">Rejeitadas</option>
            <option value="concluida">Concluídas</option>
            <option value="">Todas</option>
          </select>
          <button className="btn btn-secondary" onClick={fetchSolicitacoes}>
            <FaSyncAlt /> Atualizar
          </button>
        </FilterGroup>

        {loading ? (
          <NoDataMessage>Carregando solicitações...</NoDataMessage>
        ) : solicitacoes.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Insumo</th>
                <th>Quantidade Solicitada</th>
                <th>Status</th>
                <th>Data da Solicitação</th>
                <th>Solicitante</th>
                <th>Unidade Solicitante</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((request) => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td>{request.insumo_nome}</td>
                  <td>{request.quantidade}</td>
                  <td>{request.status}</td>
                  <td>{new Date(request.data_solicitacao).toLocaleString()}</td>
                  <td>{request.solicitante_nome}</td>
                  <td>{request.unidade_solicitante_nome}</td>
                  <td>
                    {request.status === "pendente" ? (
                      <>
                        <button
                          onClick={() => handleApproveSolicitation(request.id)}
                          style={{
                            marginRight: "5px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <FaCheckCircle style={{ marginRight: "5px" }} /> Aprovar
                        </button>
                        <button
                          onClick={() => handleRejectSolicitation(request.id)}
                          style={{
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <FaTimesCircle style={{ marginRight: "5px" }} /> Rejeitar
                        </button>
                      </>
                    ) : (
                      <span>{request.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <NoDataMessage>
            Nenhuma solicitação de insumo encontrada para o status selecionado.
          </NoDataMessage>
        )}
      </ActionCard>
    </StockPageContainer>
  );
};

export default SaidaInsumo;
