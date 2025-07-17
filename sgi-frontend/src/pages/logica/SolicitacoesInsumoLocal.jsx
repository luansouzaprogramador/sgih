import React, { useState, useEffect } from "react";
import api from "../../api";
import {
  FaPlus,
  FaClipboardList,
  FaBoxOpen,
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import {
  InsumosPageContainer, // Reutilizando estilos de Insumos
  Title,
  InsumoCard,
  FormGrid,
  TableContainer,
  MessageContainer,
  NoDataMessage,
  FilterGroup, // Adicionado FilterGroup aqui
} from "../style/InsumosStyles"; // Importando estilos

const SolicitacoesInsumoLocal = () => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]); // Para exibir as solicitações feitas pelo almoxarife local
  const [requestFormData, setRequestFormData] = useState({
    insumo_id: "",
    quantidade: "",
  });
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [filterStatus, setFilterStatus] = useState("pendente"); // Default filter for local requests

  const displayMessage = (message, type) => {
    setFeedbackMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setFeedbackMessage(null);
      setMessageType(null);
    }, 5000);
  };

  useEffect(() => {
    fetchInsumos();
    fetchSolicitacoesLocais();
  }, [user, filterStatus]);

  const fetchInsumos = async () => {
    try {
      const response = await api.get("/insumos");
      setInsumos(response.data);
    } catch (error) {
      console.error("Erro ao buscar insumos:", error);
      displayMessage("Erro ao carregar insumos para solicitação.", "error");
    }
  };

  const fetchSolicitacoesLocais = async () => {
    if (!user || user.tipo_usuario !== "almoxarife_local") {
      setSolicitacoes([]);
      return;
    }
    try {
      // Almoxarife local busca SUAS PRÓPRIAS solicitações para o central
      const response = await api.get(`/solicitacoes/minhas-solicitacoes-central?status=${filterStatus}`);
      setSolicitacoes(response.data);
    } catch (error) {
      console.error("Erro ao buscar solicitações do almoxarife local:", error);
      displayMessage("Erro ao carregar suas solicitações de insumo.", "error");
    }
  };

  const handleRequestFormChange = (e) => {
    const { name, value } = e.target;
    setRequestFormData({ ...requestFormData, [name]: value });
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      // Rota para almoxarife local solicitar insumo ao central
      await api.post("/solicitacoes/solicitar-central", requestFormData);
      displayMessage("Solicitação de insumo enviada ao almoxarife central com sucesso!", "success");
      setRequestFormData({
        insumo_id: "",
        quantidade: "",
      });
      fetchSolicitacoesLocais(); // Recarregar a lista de solicitações
    } catch (error) {
      console.error("Erro ao enviar solicitação de insumo ao almoxarife central:", error);
      displayMessage(
        `Erro ao enviar solicitação: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  if (user?.tipo_usuario !== "almoxarife_local") {
    return (
      <InsumosPageContainer>
        <MessageContainer type="error">
          <FaExclamationCircle /> Você não tem permissão para acessar esta
          página.
        </MessageContainer>
      </InsumosPageContainer>
    );
  }

  return (
    <InsumosPageContainer>
      <Title>Solicitações de Insumo (Almoxarife Local)</Title>

      {feedbackMessage && (
        <MessageContainer type={messageType}>
          {messageType === "success" && <FaCheckCircle />}
          {messageType === "error" && <FaExclamationCircle />}
          {messageType === "info" && <FaInfoCircle />}
          {feedbackMessage}
        </MessageContainer>
      )}

      <InsumoCard>
        <h4>
          <FaClipboardList /> Solicitar Insumo ao Almoxarife Central
        </h4>
        <form onSubmit={handleSubmitRequest}>
          <FormGrid>
            <div className="form-group">
              <label htmlFor="insumo_id">Selecione o Insumo</label>
              <select
                id="insumo_id"
                name="insumo_id"
                value={requestFormData.insumo_id}
                onChange={handleRequestFormChange}
                required
              >
                <option value="">-- Selecione --</option>
                {insumos.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>
                    {insumo.nome} ({insumo.unidade_medida})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="quantidade">Quantidade Solicitada</label>
              <input
                type="number"
                id="quantidade"
                name="quantidade"
                value={requestFormData.quantidade}
                onChange={handleRequestFormChange}
                min="1"
                required
              />
            </div>
          </FormGrid>
          <button type="submit" className="btn btn-primary">
            Enviar Solicitação
          </button>
        </form>
      </InsumoCard>

      <InsumoCard>
        <h4>
          <FaBoxOpen /> Minhas Solicitações ao Almoxarife Central
        </h4>
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
            <option value="">Todas</option>
          </select>
        </FilterGroup>
        <TableContainer>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Insumo</th>
                <th>Quantidade</th>
                <th>Status</th>
                <th>Data da Solicitação</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.length > 0 ? (
                solicitacoes.map((solicitacao) => (
                  <tr key={solicitacao.id}>
                    <td>{solicitacao.id}</td>
                    <td>{solicitacao.insumo_nome}</td>
                    <td>{solicitacao.quantidade}</td>
                    <td>{solicitacao.status}</td>
                    <td>{new Date(solicitacao.data_solicitacao).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <NoDataMessage>Nenhuma solicitação encontrada.</NoDataMessage>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableContainer>
      </InsumoCard>
    </InsumosPageContainer>
  );
};

export default SolicitacoesInsumoLocal;
