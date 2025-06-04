import React, { useState, useEffect } from "react";
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
import api from "../../api";
import {
  AgendamentosPageContainer,
  Title,
  Card,
  AddedItemsList,
  TableContainer,
  Table,
  StatusPill,
  ActionButtons,
  AddItemGroup,
  MessageContainer,
} from "../style/AgendamentosStyles";

const Agendamentos = () => {
  const { user } = useAuth();
  const [unidades, setUnidades] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [lotesPorUnidade, setLotesPorUnidade] = useState({});
  const [agendamentos, setAgendamentos] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  const [form, setForm] = useState({
    unidade_origem_id: user?.unidade_id || "",
    unidade_destino_id: "",
    data_agendamento: null,
    observacao: "",
    itens: [],
  });

  const [currentItem, setCurrentItem] = useState({
    lote_id: "",
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
    const fetchData = async () => {
      try {
        const [unidadesRes, insumosRes] = await Promise.all([
          api.get("/unidades"),
          api.get("/insumos"),
        ]);
        setUnidades(unidadesRes.data);
        setInsumos(insumosRes.data);

        if (user?.unidade_id) {
          const lotesRes = await api.get(`/lotes/${user.unidade_id}`);
          setLotesPorUnidade((prev) => ({
            ...prev,
            [user.unidade_id]: lotesRes.data,
          }));
        }
        if (user?.tipo_usuario === "gerente_estoque") {
          unidadesRes.data.forEach(async (unit) => {
            const lotesRes = await api.get(`/lotes/${unit.id}`);
            setLotesPorUnidade((prev) => ({
              ...prev,
              [unit.id]: lotesRes.data,
            }));
          });
        }

        fetchAgendamentos();
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        displayMessage("Erro ao carregar dados iniciais", "error");
      }
    };

    fetchData();
  }, [user]);

  const fetchAgendamentos = async () => {
    try {
      let endpoint = "/agendamentos";
      if (user?.tipo_usuario === "estoquista") {
        endpoint = `/agendamentos/${user.unidade_id}`;
      }
      const response = await api.get(endpoint);
      setAgendamentos(response.data);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      displayMessage("Erro ao carregar agendamentos", "error");
    }
  };

  const handleAddItem = () => {
    if (!currentItem.lote_id || !currentItem.quantidade) {
      displayMessage("Selecione um lote e informe a quantidade.", "error");
      return;
    }

    const selectedLote = lotesPorUnidade[form.unidade_origem_id]?.find(
      (l) => l.id == currentItem.lote_id
    );

    if (!selectedLote) {
      displayMessage(
        "Lote não encontrado na unidade de origem selecionada.",
        "error"
      );
      return;
    }

    if (currentItem.quantidade > selectedLote.quantidade_atual) {
      displayMessage(
        "Quantidade a agendar excede o estoque disponível no lote.",
        "error"
      );
      return;
    }

    const insumoNome = insumos.find(
      (i) => i.id === selectedLote.insumo_id
    )?.nome;

    setForm((prevForm) => ({
      ...prevForm,
      itens: [
        ...prevForm.itens,
        {
          lote_id: parseInt(currentItem.lote_id),
          quantidade: parseInt(currentItem.quantidade),
          insumo_nome: insumoNome,
          numero_lote: selectedLote.numero_lote,
        },
      ],
    }));
    setCurrentItem({ lote_id: "", quantidade: "" });
  };

  const handleRemoveItem = (index) => {
    setForm((prevForm) => ({
      ...prevForm,
      itens: prevForm.itens.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.itens.length === 0) {
      displayMessage("Adicione pelo menos um item ao agendamento.", "error");
      return;
    }

    if (!form.data_agendamento) {
      displayMessage("Selecione uma data para o agendamento.", "error");
      return;
    }

    try {
      const payload = {
        ...form,
        data_agendamento: form.data_agendamento
          .toISOString()
          .slice(0, 19)
          .replace("T", " "),
      };
      await api.post("/agendamentos", payload);
      displayMessage("Agendamento criado com sucesso!", "success");
      setForm({
        unidade_origem_id: user?.unidade_id || "",
        unidade_destino_id: "",
        data_agendamento: null,
        observacao: "",
        itens: [],
      });
      fetchAgendamentos();
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      displayMessage(
        `Erro ao criar agendamento: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const handleUpdateScheduleStatus = async (scheduleId, status) => {
    if (
      !window.confirm(`Tem certeza que deseja mudar o status para "${status}"?`)
    ) {
      return;
    }
    try {
      await api.put(`/agendamentos/${scheduleId}/status`, { status });
      displayMessage(
        "Status do agendamento atualizado com sucesso!",
        "success"
      );
      fetchAgendamentos();
    } catch (error) {
      console.error("Erro ao atualizar status do agendamento:", error);
      displayMessage(
        `Erro ao atualizar status: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const availableLotes = lotesPorUnidade[form.unidade_origem_id] || [];
  const filteredAvailableLotes = availableLotes.filter((lote) => {
    const isExpired = new Date(lote.data_validade) < new Date();
    return lote.quantidade_atual > 0 && lote.status === "ativo" && !isExpired;
  });

  return (
    <AgendamentosPageContainer>
      <Title>Agendamento de Entregas</Title>

      {feedbackMessage && (
        <MessageContainer type={messageType}>
          {messageType === "error" ? (
            <FaExclamationCircle />
          ) : (
            <FaCheckCircle />
          )}
          {feedbackMessage}
        </MessageContainer>
      )}

      {user?.tipo_usuario === "gerente_estoque" && (
        <Card>
          <h4>
            <FaCalendarAlt /> Criar Novo Agendamento de Entrega
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Unidade de Origem:</label>
              <select
                value={form.unidade_origem_id}
                onChange={(e) => {
                  setForm({ ...form, unidade_origem_id: e.target.value });
                  setCurrentItem({ lote_id: "", quantidade: "" });
                }}
                required
              >
                <option value="">Selecione a Unidade de Origem</option>
                {unidades.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Unidade de Destino:</label>
              <select
                value={form.unidade_destino_id}
                onChange={(e) =>
                  setForm({ ...form, unidade_destino_id: e.target.value })
                }
                required
              >
                <option value="">Selecione a Unidade de Destino</option>
                {unidades
                  .filter((unit) => unit.id != form.unidade_origem_id)
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.nome}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label>Data e Hora do Agendamento:</label>
              <DatePicker
                selected={form.data_agendamento}
                onChange={(date) =>
                  setForm({ ...form, data_agendamento: date })
                }
                showTimeSelect
                dateFormat="dd/MM/yyyy HH:mm"
                timeFormat="HH:mm"
                timeIntervals={15}
                placeholderText="Selecione a data e hora"
                required
              />
            </div>

            <div className="form-group">
              <label>Observação:</label>
              <textarea
                value={form.observacao}
                onChange={(e) =>
                  setForm({ ...form, observacao: e.target.value })
                }
                rows="3"
                placeholder="Ex: Urgente, manusear com cuidado..."
              ></textarea>
            </div>

            <h5>Adicionar Itens ao Agendamento:</h5>
            <AddItemGroup>
              <div className="form-group" style={{ flex: 2 }}>
                <label>Lote do Insumo:</label>
                <select
                  value={currentItem.lote_id}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, lote_id: e.target.value })
                  }
                  disabled={!form.unidade_origem_id}
                >
                  <option value="">Selecione o Lote</option>
                  {filteredAvailableLotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.insumo_nome} - Lote: {lote.numero_lote} (Qtd:{" "}
                      {lote.quantidade_atual})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Quantidade:</label>
                <input
                  type="number"
                  value={currentItem.quantidade}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      quantidade: e.target.value,
                    })
                  }
                  min="1"
                  disabled={!currentItem.lote_id}
                />
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn btn-primary"
              >
                <FaPlus /> Adicionar
              </button>
            </AddItemGroup>

            {form.itens.length > 0 && (
              <AddedItemsList>
                <h5>Itens Agendados:</h5>
                <ul>
                  {form.itens.map((item, index) => (
                    <li key={index}>
                      {item.insumo_nome} (Lote: {item.numero_lote}) - Qtd:{" "}
                      {item.quantidade}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                      >
                        X
                      </button>
                    </li>
                  ))}
                </ul>
              </AddedItemsList>
            )}

            <button type="submit" className="btn btn-primary">
              <FaExchangeAlt /> Agendar Entrega
            </button>
          </form>
        </Card>
      )}

      <TableContainer>
        <h3>Agendamentos de Entregas</h3>
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Data/Hora</th>
              <th>Itens</th>
              <th>Status</th>
              <th>Responsável</th>
              {user?.tipo_usuario === "gerente_estoque" && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {agendamentos.length > 0 ? (
              agendamentos.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.id}</td>
                  <td>{schedule.unidade_origem_nome}</td>
                  <td>{schedule.unidade_destino_nome}</td>
                  <td>
                    {new Date(schedule.data_agendamento).toLocaleString()}
                  </td>
                  <td>
                    {schedule.itens_agendados &&
                    schedule.itens_agendados.length > 0
                      ? schedule.itens_agendados.map((item) => (
                          <div key={item.lote_id}>
                            {item.insumo_nome}: {item.quantidade}
                          </div>
                        ))
                      : "N/A"}
                  </td>
                  <td>
                    <StatusPill status={schedule.status}>
                      {schedule.status === "pendente" && "Pendente"}
                      {schedule.status === "em_transito" && "Em Trânsito"}
                      {schedule.status === "concluido" && "Concluído"}
                      {schedule.status === "cancelado" && "Cancelado"}
                    </StatusPill>
                  </td>
                  <td>{schedule.responsavel_agendamento_nome}</td>
                  {user?.tipo_usuario === "gerente_estoque" && (
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
                        {schedule.status === "em_transito" && (
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
                  Nenhum agendamento encontrado.
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
