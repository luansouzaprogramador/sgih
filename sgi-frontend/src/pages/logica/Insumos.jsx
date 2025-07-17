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
    estoque_minimo: 0, // Adicionado estoque_minimo no estado do formulário
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
    }, 5000);
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
    if (editingInsumo) {
      try {
        await api.put(`/insumos/${editingInsumo.id}`, formData);
        displayMessage("Insumo atualizado com sucesso!", "success");
        setEditingInsumo(null);
      } catch (error) {
        console.error("Erro ao atualizar insumo:", error);
        displayMessage(
          `Erro ao atualizar insumo: ${
            error.response?.data?.message || error.message
          }`,
          "error"
        );
      }
    } else {
      try {
        await api.post("/insumos", formData);
        displayMessage("Insumo cadastrado com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao cadastrar insumo:", error);
        displayMessage(
          `Erro ao cadastrar insumo: ${
            error.response?.data?.message || error.message
          }`,
          "error"
        );
      }
    }
    setFormData({
      nome: "",
      descricao: "",
      unidade_medida: "",
      local_armazenamento: "",
      estoque_minimo: 0, // Resetar também o estoque_minimo após submissão
    });
    fetchInsumos(); // Recarregar a lista de insumos
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      // Endpoint correto baseado na montagem do backend: /api/solicitacoes_insumo
      await api.post("/solicitacoes_insumo", requestFormData);
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

  const handleEditClick = (insumo) => {
    setEditingInsumo(insumo);
    setFormData({
      nome: insumo.nome,
      descricao: insumo.descricao,
      unidade_medida: insumo.unidade_medida,
      local_armazenamento: insumo.local_armazenamento,
      estoque_minimo: insumo.estoque_minimo, // Carregar estoque_minimo para edição
    });
    displayMessage("Editando insumo. Faça suas alterações.", "info");
  };

  const handleDeleteInsumo = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este insumo?")) {
      try {
        await api.delete(`/insumos/${id}`);
        displayMessage("Insumo excluído com sucesso!", "success");
        fetchInsumos(); // Recarregar a lista de insumos
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

  if (
    !user ||
    (user.tipo_usuario !== "almoxarife_central" &&
      user.tipo_usuario !== "almoxarife_local" &&
      user.tipo_usuario !== "gestor" &&
      user.tipo_usuario !== "profissional_saude")
  ) {
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
      <Title>Gestão de Insumos</Title>

      {feedbackMessage && (
        <MessageContainer type={messageType}>
          {messageType === "success" && <FaCheckCircle />}
          {messageType === "error" && <FaExclamationCircle />}
          {messageType === "info" && <FaInfoCircle />}
          {feedbackMessage}
        </MessageContainer>
      )}

      {(user.tipo_usuario === "almoxarife_central" ||
        user.tipo_usuario === "almoxarife_local") && (
        <InsumoCard>
          <h4>
            {editingInsumo ? <FaEdit /> : <FaPlus />}
            {editingInsumo ? "Editar Insumo" : "Cadastrar Novo Insumo"}
          </h4>
          <form onSubmit={handleSubmit}>
            <FormGrid>
              <div className="form-group">
                <label>Nome do Insumo:</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descrição:</label>
                <input
                  type="text"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label>Unidade de Medida:</label>
                <input
                  type="text"
                  name="unidade_medida"
                  value={formData.unidade_medida}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Local de Armazenamento:</label>
                <input
                  type="text"
                  name="local_armazenamento"
                  value={formData.local_armazenamento}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label>Estoque Mínimo:</label>
                <input
                  type="number"
                  name="estoque_minimo"
                  value={formData.estoque_minimo}
                  onChange={handleFormChange}
                  min="0"
                  required
                />
              </div>
            </FormGrid>
            <button type="submit" className="btn btn-primary">
              {editingInsumo ? "Atualizar Insumo" : "Cadastrar Insumo"}
            </button>
            {editingInsumo && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingInsumo(null);
                  setFormData({
                    nome: "",
                    descricao: "",
                    unidade_medida: "",
                    local_armazenamento: "",
                    estoque_minimo: 0,
                  });
                  displayMessage("Edição cancelada.", "info");
                }}
              >
                Cancelar Edição
              </button>
            )}
          </form>
        </InsumoCard>
      )}

      {(user.tipo_usuario === "gestor" ||
        user.tipo_usuario === "profissional_saude") && (
        <InsumoCard>
          <h4>
            <FaClipboardList /> Solicitar Insumo
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
      )}

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
                <th>Estoque Mínimo</th> {/* Nova coluna para exibir o estoque mínimo */}
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
                    <td>{insumo.descricao || "N/A"}</td>
                    <td>{insumo.unidade_medida || "N/A"}</td>
                    <td>{insumo.local_armazenamento || "N/A"}</td>
                    <td>{insumo.estoque_minimo}</td> {/* Exibir o valor do estoque_minimo */}
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
                        ? "7" // Colspan ajustado para incluir a nova coluna
                        : "6" // Colspan ajustado para incluir a nova coluna
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
    </InsumosPageContainer>
  );
};

export default Insumos;
