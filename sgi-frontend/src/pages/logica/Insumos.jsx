import React, { useState, useEffect } from "react";
import api from "../../api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
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
} from "../style/InsumosStyles"; // Import styled components

const Insumos = () => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    unidade_medida: "",
    local_armazenamento: "",
  });
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // 'success', 'error', 'info'

  const displayMessage = (message, type) => {
    setFeedbackMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setFeedbackMessage(null);
      setMessageType(null);
    }, 5000); // Message disappears after 5 seconds
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
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingInsumo) {
      try {
        await api.put(`/insumos/${editingInsumo.id}`, form);
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
        await api.post("/insumos", form);
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
    setForm({
      nome: "",
      descricao: "",
      unidade_medida: "",
      local_armazenamento: "",
    });
    fetchInsumos(); // Refresh the list
  };

  const handleEditClick = (insumo) => {
    setEditingInsumo(insumo);
    setForm({
      nome: insumo.nome,
      descricao: insumo.descricao,
      unidade_medida: insumo.unidade_medida,
      local_armazenamento: insumo.local_armazenamento,
    });
    displayMessage("Editando insumo. Faça suas alterações.", "info");
  };

  const handleDeleteInsumo = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este insumo?")) {
      try {
        await api.delete(`/insumos/${id}`);
        displayMessage("Insumo excluído com sucesso!", "success");
        fetchInsumos(); // Refresh the list
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

  if (user?.tipo_usuario !== "gerente_estoque") {
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
                value={form.nome}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Descrição:</label>
              <input
                type="text"
                name="descricao"
                value={form.descricao}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label>Unidade de Medida:</label>
              <input
                type="text"
                name="unidade_medida"
                value={form.unidade_medida}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Local de Armazenamento:</label>
              <input
                type="text"
                name="local_armazenamento"
                value={form.local_armazenamento}
                onChange={handleFormChange}
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
                setForm({
                  nome: "",
                  descricao: "",
                  unidade_medida: "",
                  local_armazenamento: "",
                });
                displayMessage("Edição cancelada.", "info");
              }}
            >
              Cancelar Edição
            </button>
          )}
        </form>
      </InsumoCard>

      <InsumoCard>
        <h4>Lista de Insumos Cadastrados</h4>
        <TableContainer>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Unidade de Medida</th>
                <th>Local de Armazenamento</th>
                <th>Ações</th>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
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
