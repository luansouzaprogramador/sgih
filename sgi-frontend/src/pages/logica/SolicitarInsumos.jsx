import React, { useState, useEffect } from "react";
import api from "../../api";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaClipboardList, // Icon for request section
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import {
  InsumosPageContainer,
  Title,
  InsumoCard,
  FormGrid,
  MessageContainer,
} from "../style/InsumosStyles";

const SolicitarInsumos = () => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [requestFormData, setRequestFormData] = useState({
    insumo_id: "",
    quantidade: "",
  });

  const displayMessage = (message, type) => {
    setFeedbackMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setFeedbackMessage(null);
      setMessageType(null);
    }, 5000); // A mensagem desaparece após 5 segundos
  };

  useEffect(() => {
    fetchInsumos();
  }, []);

  const fetchInsumos = async () => {
    try {
      const response = await api.get("/insumos");
      setInsumos(response.data);
    } catch (error) {
      console.error("Erro ao buscar insumos:", error);
      displayMessage("Erro ao carregar insumos.", "error");
    }
  };

  const handleRequestFormChange = (e) => {
    const { name, value } = e.target;
    setRequestFormData({ ...requestFormData, [name]: value });
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      // Esta rota é para gestor/profissional_saude solicitando do almoxarife local
      await api.post("/solicitacoes", requestFormData);
      displayMessage("Solicitação de insumo enviada com sucesso!", "success");
      setRequestFormData({
        insumo_id: "",
        quantidade: "",
      });
    } catch (error) {
      console.error("Erro ao enviar solicitação de insumo:", error);
      displayMessage(
        `Erro ao enviar solicitação: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const canRequestInsumos = user?.tipo_usuario === "gestor" || user?.tipo_usuario === "profissional_saude";

  // Redireciona ou mostra mensagem de erro se o usuário não tiver permissão
  if (!canRequestInsumos) {
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
      <Title>Solicitar Insumos</Title>

      {feedbackMessage && (
        <MessageContainer type={messageType}>
          {messageType === "success" && <FaCheckCircle />}
          {messageType === "error" && <FaExclamationCircle />}
          {messageType === "info" && <FaInfoCircle />}
          {feedbackMessage}
        </MessageContainer>
      )}

      {/* Seção de Solicitação de Insumos */}
      <InsumoCard>
        <h4>
          <FaClipboardList /> Solicitar Insumo
        </h4>
        <form onSubmit={handleSubmitRequest}>
          <FormGrid>
            <div className="form-group">
              <label htmlFor="request_insumo_id">Selecione o Insumo</label>
              <select
                id="request_insumo_id"
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
              <label htmlFor="request_quantidade">Quantidade Solicitada</label>
              <input
                type="number"
                id="request_quantidade"
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
    </InsumosPageContainer>
  );
};

export default SolicitarInsumos;
