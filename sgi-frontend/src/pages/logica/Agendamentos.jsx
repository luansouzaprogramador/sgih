import React, { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FaPlus,
  FaCheckCircle,
  FaTruck,
  FaCalendarAlt,
  FaExchangeAlt,
  FaExclamationCircle,
} from "react-icons/fa";
import {
  AgendamentosPageContainer,
  Title,
  Card,
  FormGrid,
  FilterGroup,
  TableContainer,
  Table,
  StatusIndicator,
  ActionButtons,
  MessageContainer,
  NoDataMessage,
} from "../style/AgendamentosStyles"; // Import styled components

const Agendamentos = () => {
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [form, setForm] = useState({
    insumo_id: "",
    unidade_origem_id: "",
    unidade_destino_id: "",
    quantidade: "",
    data_agendamento: null,
    status: "pendente", // Default status
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("pendente");
  const [filterUnit, setFilterUnit] = useState("");

  // Messages state
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

  const fetchAgendamentos = async () => {
    try {
      setLoading(true);
      let endpoint = "/agendamentos";
      if (user?.tipo_usuario === "estoquista") {
        endpoint = `/agendamentos/${user.unidade_id}`; // Fetch for their unit
      }
      const response = await api.get(endpoint);
      setAgendamentos(response.data);
    } catch (err) {
      console.error("Error fetching agendamentos:", err);
      setError("Failed to load agendamentos.");
      displayMessage("Erro ao carregar agendamentos.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchInsumos = async () => {
    try {
      const response = await api.get("/insumos");
      setInsumos(response.data);
    } catch (error) {
      console.error("Error fetching insumos:", error);
    }
  };

  const fetchUnidades = async () => {
    try {
      const response = await api.get("/unidades");
      setUnidades(response.data);
    } catch (error) {
      console.error("Error fetching unidades:", error);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
    fetchInsumos();
    fetchUnidades();
    if (user?.unidade_id) {
      setForm((prev) => ({ ...prev, unidade_origem_id: user.unidade_id }));
      setFilterUnit(user.unidade_id); // Estoquista filters by their unit by default
    }
  }, [user]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleDateChange = (date) => {
    setForm({ ...form, data_agendamento: date });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.unidade_origem_id === form.unidade_destino_id) {
      displayMessage(
        "Unidade de origem e destino não podem ser as mesmas.",
        "error"
      );
      return;
    }
    try {
      const payload = {
        ...form,
        quantidade: parseInt(form.quantidade),
        data_agendamento: form.data_agendamento
          ? form.data_agendamento.toISOString().split("T")[0]
          : null,
      };
      await api.post("/agendamentos", payload);
      displayMessage("Agendamento criado com sucesso!", "success");
      setForm({
        insumo_id: "",
        unidade_origem_id: user?.unidade_id || "",
        unidade_destino_id: "",
        quantidade: "",
        data_agendamento: null,
        status: "pendente",
      });
      fetchAgendamentos(); // Refresh list
    } catch (err) {
      console.error("Error creating agendamento:", err);
      displayMessage(
        `Erro ao criar agendamento: ${
          err.response?.data?.message || err.message
        }`,
        "error"
      );
    }
  };

  const handleUpdateScheduleStatus = async (id, newStatus) => {
    try {
      await api.put(`/agendamentos/${id}/status`, { status: newStatus });
      displayMessage(`Agendamento atualizado para ${newStatus}!`, "success");
      fetchAgendamentos(); // Refresh list
    } catch (err) {
      console.error(`Error updating agendamento status to ${newStatus}:`, err);
      displayMessage(
        `Erro ao atualizar status do agendamento: ${
          err.response?.data?.message || err.message
        }`,
        "error"
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pendente":
        return "orange";
      case "em_transito":
        return "blue";
      case "concluido":
        return "green";
      case "cancelado":
        return "red";
      default:
        return "gray";
    }
  };

  const filteredAgendamentos = agendamentos.filter((schedule) => {
    const matchesStatus =
      filterStatus === "" || schedule.status === filterStatus;
    const matchesUnit =
      filterUnit === "" ||
      schedule.unidade_origem_id === parseInt(filterUnit) ||
      schedule.unidade_destino_id === parseInt(filterUnit);

    return matchesStatus && matchesUnit;
  });

  if (loading)
    return (
      <AgendamentosPageContainer>
        Carregando Agendamentos...
      </AgendamentosPageContainer>
    );
  if (error)
    return (
      <AgendamentosPageContainer style={{ color: "red" }}>
        Erro: {error}
      </AgendamentosPageContainer>
    );

  return (
    <AgendamentosPageContainer>
      <Title>Agendamentos de Transferência</Title>

      {feedbackMessage && (
        <MessageContainer type={messageType}>
          {messageType === "success" && <FaCheckCircle />}
          {messageType === "error" && <FaExclamationCircle />}
          {feedbackMessage}
        </MessageContainer>
      )}

      {(user?.tipo_usuario === "gerente_estoque" ||
        user?.tipo_usuario === "estoquista") && (
        <Card>
          <h3>
            <FaPlus /> Novo Agendamento
          </h3>
          <form onSubmit={handleSubmit}>
            <FormGrid>
              <div className="form-group">
                <label>Insumo:</label>
                <select
                  name="insumo_id"
                  value={form.insumo_id}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Selecione o Insumo</option>
                  {insumos.map((insumo) => (
                    <option key={insumo.id} value={insumo.id}>
                      {insumo.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Unidade de Origem:</label>
                <select
                  name="unidade_origem_id"
                  value={form.unidade_origem_id}
                  onChange={handleFormChange}
                  disabled={user?.tipo_usuario === "estoquista"}
                  required
                >
                  <option value="">Selecione a Unidade</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Unidade de Destino:</label>
                <select
                  name="unidade_destino_id"
                  value={form.unidade_destino_id}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Selecione a Unidade</option>
                  {unidades
                    .filter((u) => u.id !== parseInt(form.unidade_origem_id))
                    .map((unidade) => (
                      <option key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantidade:</label>
                <input
                  type="number"
                  name="quantidade"
                  value={form.quantidade}
                  onChange={handleFormChange}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Data do Agendamento:</label>
                <DatePicker
                  selected={form.data_agendamento}
                  onChange={handleDateChange}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Selecione a data"
                  required
                />
              </div>
            </FormGrid>
            <button type="submit" className="btn btn-primary">
              Criar Agendamento
            </button>
          </form>
        </Card>
      )}

      <TableContainer>
        <h3>
          <FaCalendarAlt /> Meus Agendamentos
        </h3>
        <FilterGroup>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="em_transito">Em Trânsito</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>

          {user?.tipo_usuario === "gerente_estoque" && (
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
        </FilterGroup>

        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Insumo</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Quantidade</th>
              <th>Data</th>
              <th>Status</th>
              {(user?.tipo_usuario === "gerente_estoque" ||
                user?.tipo_usuario === "estoquista") && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filteredAgendamentos.length > 0 ? (
              filteredAgendamentos.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.id}</td>
                  <td>
                    {insumos.find((i) => i.id === schedule.insumo_id)?.nome ||
                      "N/A"}
                  </td>
                  <td>
                    {unidades.find((u) => u.id === schedule.unidade_origem_id)
                      ?.nome || "N/A"}
                  </td>
                  <td>
                    {unidades.find((u) => u.id === schedule.unidade_destino_id)
                      ?.nome || "N/A"}
                  </td>
                  <td>{schedule.quantidade}</td>
                  <td>
                    {new Date(schedule.data_agendamento).toLocaleDateString()}
                  </td>
                  <td>
                    <StatusIndicator
                      statusType={getStatusColor(schedule.status)}
                    >
                      {schedule.status === "pendente" && "Pendente"}
                      {schedule.status === "em_transito" && "Em Trânsito"}
                      {schedule.status === "concluido" && "Concluído"}
                      {schedule.status === "cancelado" && "Cancelado"}
                    </StatusIndicator>
                  </td>
                  {(user?.tipo_usuario === "gerente_estoque" ||
                    user?.tipo_usuario === "estoquista") && (
                    <td>
                      <ActionButtons>
                        {schedule.status === "pendente" && (
                          <button
                            className="btn btn-info"
                            onClick={() =>
                              handleUpdateScheduleStatus(
                                schedule.id,
                                "em_transito"
                              )
                            }
                            title="Marcar como Em Trânsito"
                          >
                            <FaTruck />
                          </button>
                        )}
                        {(schedule.status === "pendente" ||
                          schedule.status === "em_transito") &&
                          user?.unidade_id === schedule.unidade_destino_id && (
                            <button
                              className="btn btn-success"
                              onClick={() =>
                                handleUpdateScheduleStatus(
                                  schedule.id,
                                  "concluido"
                                )
                              }
                              title="Marcar como Concluído"
                            >
                              <FaCheckCircle />
                            </button>
                          )}
                        {(schedule.status === "pendente" ||
                          schedule.status === "em_transito") && (
                          <button
                            className="btn btn-secondary"
                            onClick={() =>
                              handleUpdateScheduleStatus(
                                schedule.id,
                                "cancelado"
                              )
                            }
                            title="Cancelar Agendamento"
                          >
                            Cancelar
                          </button>
                        )}
                      </ActionButtons>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={user?.tipo_usuario === "gerente_estoque" ? "8" : "7"}
                >
                  <NoDataMessage>Nenhum agendamento encontrado.</NoDataMessage>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableContainer>
    </AgendamentosPageContainer>
  );
};

export default Agendamentos;
