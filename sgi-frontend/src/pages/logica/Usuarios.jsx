import React, { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import {
  FaUserPlus,
  FaUsers,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
} from "react-icons/fa";
import {
  SettingsPageContainer,
  Title,
  Section,
  FormGrid,
  UserTableContainer,
  ButtonGroup,
  MessageContainer,
  NoDataMessage,
} from "../style/UsuariosStyles";

const Usuarios = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    password: "",
    tipo_usuario: "",
    unidade_id: "",
  });
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  const displayMessage = (message, type) => {
    setFeedbackMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setFeedbackMessage(null);
      setMessageType(null);
    }, 5000);
  };

  useEffect(() => {
    fetchUsers();
    fetchUnidades();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      displayMessage("Erro ao carregar usuários.", "error");
    }
  };

  const fetchUnidades = async () => {
    try {
      const response = await api.get("/unidades");
      setUnidades(response.data);
    } catch (error) {
      console.error("Erro ao buscar unidades:", error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nome: form.nome,
        email: form.email,
        senha: form.password, // Campo corrigido para 'senha' conforme esperado pelo backend
        tipo_usuario: form.tipo_usuario,
        unidade_id: form.unidade_id === "" ? null : parseInt(form.unidade_id),
      };

      if (editingUser) {
        // Remove senha se não for alterada
        if (!payload.senha) {
          delete payload.senha;
        }
        await api.put(`/users/${editingUser.id}`, payload);
        displayMessage("Usuário atualizado com sucesso!", "success");
        setEditingUser(null);
      } else {
        await api.post("/auth/register", payload);
        displayMessage("Usuário cadastrado com sucesso!", "success");
      }

      setForm({
        nome: "",
        email: "",
        password: "",
        tipo_usuario: "",
        unidade_id: "",
      });
      fetchUsers();
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      displayMessage(
        `Erro ao salvar usuário: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const handleEditClick = (userToEdit) => {
    setEditingUser(userToEdit);
    setForm({
      nome: userToEdit.nome,
      email: userToEdit.email,
      password: "", // Password should not be pre-filled for security
      tipo_usuario: userToEdit.tipo_usuario,
      unidade_id: userToEdit.unidade_id || "",
    });
    displayMessage(
      "Editando usuário. Preencha a senha apenas se for alterar.",
      "info"
    );
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        await api.delete(`/users/${id}`);
        displayMessage("Usuário excluído com sucesso!", "success");
        fetchUsers();
      } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        displayMessage(
          `Erro ao excluir usuário: ${
            error.response?.data?.message || error.message
          }`,
          "error"
        );
      }
    }
  };

  if (user?.tipo_usuario !== "gestor") {
    return (
      <SettingsPageContainer>
        <MessageContainer type="error">
          <FaExclamationCircle /> Você não tem permissão para acessar esta
          página.
        </MessageContainer>
      </SettingsPageContainer>
    );
  }

  return (
    <SettingsPageContainer>
      <Title>Cadastro de Usuários</Title>

      {feedbackMessage && (
        <MessageContainer type={messageType}>
          {messageType === "success" && <FaCheckCircle />}
          {messageType === "error" && <FaExclamationCircle />}
          {messageType === "info" && <FaInfoCircle />}
          {feedbackMessage}
        </MessageContainer>
      )}

      <Section>
        <h3>
          {editingUser ? <FaEdit /> : <FaUserPlus />}
          {editingUser ? "Editar Usuário" : "Cadastrar Novo Usuário"}
        </h3>
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
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Senha:</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleFormChange}
                placeholder={
                  editingUser ? "Deixe em branco para não alterar" : ""
                }
                required={!editingUser}
              />
            </div>
            <div className="form-group">
              <label>Tipo de Usuário:</label>
              <select
                name="tipo_usuario"
                value={form.tipo_usuario}
                onChange={handleFormChange}
                required
              >
                <option value="">Selecione o Tipo</option>
                <option value="gestor">Gestor</option>
                <option value="almoxarife_central">Almoxarifado Central</option>
                <option value="almoxarife_local">Almoxarife Local</option>
                <option value="profissional_saude">Profissionais Saúde</option>
              </select>
            </div>
            <div className="form-group">
              <label>Unidade Hospitalar (se aplicável):</label>
              <select
                name="unidade_id"
                value={form.unidade_id}
                onChange={handleFormChange}
              >
                <option value="">Nenhuma</option>
                {unidades.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.nome}
                  </option>
                ))}
              </select>
            </div>
          </FormGrid>
          <button type="submit" className="btn btn-primary">
            {editingUser ? "Atualizar Usuário" : "Cadastrar Usuário"}
          </button>
          {editingUser && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEditingUser(null);
                setForm({
                  nome: "",
                  email: "",
                  password: "",
                  tipo_usuario: "",
                  unidade_id: "",
                });
                displayMessage("Edição de usuário cancelada.", "info");
              }}
            >
              Cancelar Edição
            </button>
          )}
        </form>
      </Section>

      <Section>
        <h3>
          <FaUsers /> Usuários Cadastrados
        </h3>
        <UserTableContainer>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Tipo de Usuário</th>
                <th>Unidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.tipo_usuario === "gestor"
                        ? "Gestor"
                        : u.tipo_usuario === "almoxarife_local"
                        ? "Almoxarife Local"
                        : u.tipo_usuario === "almoxarife_central"
                        ? "Almoxarife Central"
                        : "Profissional de Saúde"}
                    </td>
                    <td>
                      {unidades.find((unit) => unit.id === u.unidade_id)
                        ?.nome || "N/A"}
                    </td>
                    <td>
                      <ButtonGroup>
                        <button
                          className="btn btn-info"
                          title="Editar"
                          onClick={() => handleEditClick(u)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-danger"
                          title="Excluir"
                          onClick={() => handleDeleteUser(u.id)}
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
                    <NoDataMessage>Nenhum usuário cadastrado.</NoDataMessage>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </UserTableContainer>
      </Section>
    </SettingsPageContainer>
  );
};

export default Usuarios;
