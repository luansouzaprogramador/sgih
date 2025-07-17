import React, { useState, useEffect } from "react";
import api from "../../api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaClipboardList, // New icon for request section
  FaBoxOpen, // Icon for list section
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import {
  InsumosPageContainer,
  Title,
  InsumoCard,
  FormGrid,
  TableContainer,
  ButtonGroup,
  MessageContainer,
  NoDataMessage,
} from "../style/InsumosStyles";

const Insumos = () => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    unidade_medida: "",
    local_armazenamento: "",
  });
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRequestFormChange = (e) => {
    const { name, value } = e.target;
    setRequestFormData({ ...requestFormData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInsumo) {
        await api.put(`/insumos/${editingInsumo.id}`, formData);
        displayMessage("Insumo atualizado com sucesso!", "success");
      } else {
        await api.post("/insumos", formData);
        displayMessage("Insumo cadastrado com sucesso!", "success");
      }
      setFormData({
        nome: "",
        descricao: "",
        unidade_medida: "",
        local_armazenamento: "",
      });
      setEditingInsumo(null);
      fetchInsumos(); // Atualiza a lista
    } catch (error) {
      console.error("Erro ao salvar insumo:", error);
      displayMessage(
        `Erro ao salvar insumo: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const handleDeleteInsumo = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este insumo?")) {
      try {
        await api.delete(`/insumos/${id}`);
        displayMessage("Insumo excluído com sucesso!", "success");
        fetchInsumos(); // Atualiza a lista
      } catch (error) {
        console.error("Erro ao excluir insumo:", error);
        displayMessage(
          `Erro ao excluir insumo: ${
            error.response?.data?.message || error.message
          }`,
          "error"
        );
      }
    }
  };

  const handleEditClick = (insumo) => {
    setEditingInsumo(insumo);
    setFormData({
      nome: insumo.nome,
      descricao: insumo.descricao,
      unidade_medida: insumo.unidade_medida,
      local_armazenamento: insumo.local_armazenamento,
    });
  };

  const handleCancelEdit = () => {
    setEditingInsumo(null);
    setFormData({
      nome: "",
      descricao: "",
      unidade_medida: "",
      local_armazenamento: "",
    });
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

  const canManageInsumos = user?.tipo_usuario === "almoxarife_central" || user?.tipo_usuario === "almoxarife_local";
  const canRequestInsumos = user?.tipo_usuario === "gestor" || user?.tipo_usuario === "profissional_saude";

  return (
    <InsumosPageContainer>
      <Title>Gerenciar Insumos</Title>

      {feedbackMessage && (
        <MessageContainer type={messageType}>
          {messageType === "success" && <FaCheckCircle />}
          {messageType === "error" && <FaExclamationCircle />}
          {messageType === "info" && <FaInfoCircle />}
          {feedbackMessage}
        </MessageContainer>
      )}

      {/* Seção de Cadastro/Edição de Insumos (apenas para almoxarifes) */}
      {canManageInsumos && (
        <InsumoCard>
          <h4>
            <FaPlus /> {editingInsumo ? "Editar Insumo" : "Cadastrar Novo Insumo"}
          </h4>
          <form onSubmit={handleSubmit}>
            <FormGrid>
              <div className="form-group">
                <label htmlFor="nome">Nome do Insumo</label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="descricao">Descrição</label>
                <input
                  type="text"
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="unidade_medida">Unidade de Medida</label>
                <input
                  type="text"
                  id="unidade_medida"
                  name="unidade_medida"
                  value={formData.unidade_medida}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="local_armazenamento">Local de Armazenamento</label>
                <input
                  type="text"
                  id="local_armazenamento"
                  name="local_armazenamento"
                  value={formData.local_armazenamento}
                  onChange={handleFormChange}
                />
              </div>
            </FormGrid>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button type="submit" className="btn btn-primary">
                {editingInsumo ? "Atualizar Insumo" : "Cadastrar Insumo"}
              </button>
              {editingInsumo && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                >
                  Cancelar Edição
                </button>
              )}
            </div>
          </form>
        </InsumoCard>
      )}

      {/* Seção de Solicitação de Insumos (apenas para gestores e profissionais de saúde) */}
      {canRequestInsumos && (
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
      )}

      {/* Seção de Lista de Insumos Cadastrados (apenas para almoxarifes) */}
      {canManageInsumos && (
        <InsumoCard>
          <h4>
            <FaBoxOpen /> Lista de Insumos Cadastrados
          </h4>
          <TableContainer>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Unidade de Medida</th>
                  <th>Local de Armazenamento</th>
                  {(user.tipo_usuario === "almoxarife_central" ||
                    user.tipo_usuario === "almoxarife_local") && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {insumos.length > 0 ? (
                  insumos.map((insumo) => (
                    <tr key={insumo.id}>
                      <td>{insumo.id}</td>
                      <td>{insumo.nome}</td>
                      <td>{insumo.descricao}</td>
                      <td>{insumo.unidade_medida}</td>
                      <td>{insumo.local_armazenamento}</td>
                      {(user.tipo_usuario === "almoxarife_central" ||
                        user.tipo_usuario === "almoxarife_local") && (
                        <td>
                          <ButtonGroup>
                            <button
                              className="btn btn-info"
                              onClick={() => handleEditClick(insumo)}
                              title="Editar Insumo"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleDeleteInsumo(insumo.id)}
                              title="Excluir Insumo"
                            >
                              <FaTrash />
                            </button>
                          </ButtonGroup>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={
                        user.tipo_usuario === "almoxarife_central" ||
                        user.tipo_usuario === "almoxarife_local"
                          ? "6"
                          : "5"
                      }
                    >
                      <NoDataMessage>Nenhum insumo cadastrado.</NoDataMessage>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableContainer>
        </InsumoCard>
      )}
    </InsumosPageContainer>
  );
};

export default Insumos;
