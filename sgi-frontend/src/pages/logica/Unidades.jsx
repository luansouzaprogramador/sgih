import React, { useState, useEffect } from "react";
import api from "../../api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaHospital,
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import {
  UnitsPageContainer,
  Title,
  UnitCard,
  FormGrid,
  TableContainer,
  ButtonGroup,
  MessageContainer,
  NoDataMessage,
} from "../style/UnidadesStyles"; // Import styled components

const Unidades = () => {
  const { user } = useAuth();
  const [unidades, setUnidades] = useState([]);
  const [editingUnit, setEditingUnit] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    endereco: "",
    telefone: "",
    email: "",
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
    fetchUnidades();
  }, []);

  const fetchUnidades = async () => {
    try {
      const response = await api.get("/unidades");
      setUnidades(response.data);
    } catch (error) {
      console.error("Erro ao buscar unidades:", error);
      displayMessage("Erro ao carregar unidades hospitalares.", "error");
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingUnit) {
      try {
        await api.put(`/unidades/${editingUnit.id}`, form);
        displayMessage("Unidade atualizada com sucesso!", "success");
        setEditingUnit(null);
      } catch (error) {
        console.error("Erro ao atualizar unidade:", error);
        displayMessage(
          `Erro ao atualizar unidade: ${
            error.response?.data?.message || error.message
          }`,
          "error"
        );
      }
    } else {
      try {
        await api.post("/unidades", form);
        displayMessage("Unidade cadastrada com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao cadastrar unidade:", error);
        displayMessage(
          `Erro ao cadastrar unidade: ${
            error.response?.data?.message || error.message
          }`,
          "error"
        );
      }
    }
    setForm({ nome: "", endereco: "", telefone: "", email: "" });
    fetchUnidades(); // Refresh the list
  };

  const handleEditClick = (unit) => {
    setEditingUnit(unit);
    setForm({
      nome: unit.nome,
      endereco: unit.endereco,
      telefone: unit.telefone,
      email: unit.email,
    });
    displayMessage("Editando unidade. Faça suas alterações.", "info");
  };

  const handleDeleteUnit = async (id) => {
    if (
      window.confirm("Tem certeza que deseja excluir esta unidade hospitalar?")
    ) {
      try {
        await api.delete(`/unidades/${id}`);
        displayMessage("Unidade excluída com sucesso!", "success");
        fetchUnidades(); // Refresh the list
      } catch (error) {
        console.error("Erro ao excluir unidade:", error);
        displayMessage(
          `Erro ao excluir unidade: ${
            error.response?.data?.message || error.message
          }`,
          "error"
        );
      }
    }
  };

  if (user?.tipo_usuario !== "gestor") {
    return (
      <UnitsPageContainer>
        <MessageContainer type="error">
          <FaExclamationCircle /> Você não tem permissão para acessar esta
          página.
        </MessageContainer>
      </UnitsPageContainer>
    );
  }

  return (
    <UnitsPageContainer>
      <Title>Gestão de Unidades Hospitalares</Title>

      {feedbackMessage && (
        <MessageContainer type={messageType}>
          {messageType === "success" && <FaCheckCircle />}
          {messageType === "error" && <FaExclamationCircle />}
          {messageType === "info" && <FaInfoCircle />}
          {feedbackMessage}
        </MessageContainer>
      )}

      <UnitCard>
        <h4>
          {editingUnit ? <FaEdit /> : <FaPlus />}
          {editingUnit
            ? "Editar Unidade Hospitalar"
            : "Cadastrar Nova Unidade Hospitalar"}
        </h4>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <div className="form-group">
              <label>Nome:</label>
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Endereço:</label>
              <input
                type="text"
                name="endereco"
                value={form.endereco}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label>Telefone:</label>
              <input
                type="text"
                name="telefone"
                value={form.telefone}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleFormChange}
              />
            </div>
          </FormGrid>
          <button type="submit" className="btn btn-primary">
            {editingUnit ? "Atualizar Unidade" : "Cadastrar Unidade"}
          </button>
          {editingUnit && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEditingUnit(null);
                setForm({ nome: "", endereco: "", telefone: "", email: "" });
                displayMessage("Edição cancelada.", "info");
              }}
            >
              Cancelar Edição
            </button>
          )}
        </form>
      </UnitCard>

      <UnitCard>
        <h4>Lista de Unidades Cadastradas</h4>
        <TableContainer>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Endereço</th>
                <th>Telefone</th>
                <th>Email</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {unidades.length > 0 ? (
                unidades.map((unit) => (
                  <tr key={unit.id}>
                    <td>{unit.id}</td>
                    <td>{unit.nome}</td>
                    <td>{unit.endereco || "N/A"}</td>
                    <td>{unit.telefone || "N/A"}</td>
                    <td>{unit.email || "N/A"}</td>
                    <td>
                      <ButtonGroup>
                        <button
                          className="btn btn-info"
                          onClick={() => handleEditClick(unit)}
                          title="Editar Unidade"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteUnit(unit.id)}
                          title="Excluir Unidade"
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
                    <NoDataMessage>
                      Nenhuma unidade hospitalar cadastrada.
                    </NoDataMessage>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableContainer>
      </UnitCard>
    </UnitsPageContainer>
  );
};

export default Unidades;
