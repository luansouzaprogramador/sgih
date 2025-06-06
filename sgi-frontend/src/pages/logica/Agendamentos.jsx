import "react-datepicker/dist/react-datepicker.css";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DatePicker from "react-datepicker";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaCheckCircle,
  FaTruck,
  FaCalendarAlt,
  FaExchangeAlt,
  FaExclamationCircle,
} from "react-icons/fa";
import api from "../../api"; // Assuming this 'api' instance handles token injection
import {
  AgendamentosPageContainer,
  Title,
  Card,
  AddedItemsList,
  TableContainer,
  Table,
  StatusPill,
  ActionButtons,
  ItemFormContainer,
  ItemFormRow,
  ItemFormColumn,
  AddItemButton,
  MessageContainer,
} from "../style/AgendamentosStyles";

const Agendamentos = () => {
  const { user, logout } = useAuth(); // Get logout function from AuthContext
  const navigate = useNavigate();

  // State Variables
  const [unidades, setUnidades] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [lotesPorUnidade, setLotesPorUnidade] = useState({});
  const [agendamentos, setAgendamentos] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // New loading state

  const [form, setForm] = useState({
    unidade_origem_id: user?.unidade_id || "", // Initialize with user's unit_id if available
    unidade_destino_id: "",
    data_agendamento: null,
    observacao: "",
    itens: [],
  });

  const [currentItem, setCurrentItem] = useState({
    lote_id: "",
    quantidade: "",
  });

  // Effect for handling user authentication and role-based redirection
  useEffect(() => {
    if (user === null) {
      // User is explicitly null, meaning not authenticated. Redirect to login.
      navigate("/login");
    } else if (user && user.tipo_usuario !== "almoxarife_central") {
      // User is authenticated but not the correct role. Redirect to dashboard.
      navigate("/dashboard");
    }
    // If user is undefined, it means authentication context is still loading.
    // We let the component render a loading state or similar until user is resolved.
  }, [user, navigate]);

  const displayMessage = useCallback((message, type) => {
    setFeedbackMessage(message);
    setMessageType(type);
    const timer = setTimeout(() => {
      setFeedbackMessage(null);
      setMessageType(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const fetchAgendamentos = useCallback(async () => {
    try {
      // For almoxarife_central, fetch all agendamentos from the general endpoint
      const response = await api.get("/agendamentos");

      const processedAgendamentos = response.data.map((agendamento) => {
        const itensAgendados = agendamento.itens_agendados_str
          ? agendamento.itens_agendados_str
              .split(",")
              .map((itemStr) => {
                const parts = itemStr
                  .trim()
                  .match(/(\d+)x (.+) \(Lote: (.+)\)/);
                if (parts) {
                  return {
                    quantidade: parseInt(parts[1]),
                    insumo_nome: parts[2],
                    numero_lote: parts[3],
                  };
                }
                return null;
              })
              .filter((item) => item !== null)
          : [];
        return { ...agendamento, itens_agendados: itensAgendados };
      });
      setAgendamentos(processedAgendamentos);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      // Specific error handling for 401/403
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        displayMessage(
          "Sessão expirada ou acesso não autorizado. Faça login novamente.",
          "error"
        );
        logout(); // Logout user and clear token
        navigate("/login"); // Redirect to login
      } else {
        displayMessage("Erro ao carregar agendamentos.", "error");
      }
    }
  }, [displayMessage, logout, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      // Ensure user is defined and is almoxarife_central before fetching data
      // This check also handles the initial undefined state of 'user'
      if (!user || user.tipo_usuario !== "almoxarife_central") {
        setIsLoading(false); // Stop loading if user is not valid for this page
        return;
      }

      setIsLoading(true); // Start loading
      try {
        const [unidadesRes, insumosRes] = await Promise.all([
          api.get("/unidades"),
          api.get("/insumos"),
        ]);
        setUnidades(unidadesRes.data);
        setInsumos(insumosRes.data);

        // Fetch lots for all units for almoxarife_central
        const lotesPromises = unidadesRes.data.map(async (unit) => {
          // This call is now correctly handled by loteRoutes.js for almoxarife_central
          const lotesRes = await api.get(`/lotes/${unit.id}`);
          return { [unit.id]: lotesRes.data };
        });

        const allLotes = await Promise.all(lotesPromises);
        const combinedLotes = allLotes.reduce(
          (acc, current) => ({ ...acc, ...current }),
          {}
        );
        setLotesPorUnidade(combinedLotes);

        // Fetch agendamentos after other data is loaded
        await fetchAgendamentos(); // Await this call to ensure it finishes

        // Set initial form origin unit if not already set or if user's unit changed
        // Ensure form.unidade_origem_id is set to user's unit_id by default for almoxarife_central
        setForm((prevForm) => ({
          ...prevForm,
          unidade_origem_id: user.unidade_id || "",
        }));
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        if (
          error.response &&
          (error.response.status === 401 || error.response.status === 403)
        ) {
          displayMessage(
            "Sessão expirada ou acesso não autorizado. Faça login novamente.",
            "error"
          );
          logout();
          navigate("/login");
        } else {
          displayMessage(
            "Erro ao carregar dados iniciais. Tente novamente.",
            "error"
          );
        }
      } finally {
        setIsLoading(false); // End loading
      }
    };

    fetchData();
  }, [user, fetchAgendamentos, displayMessage, navigate, logout]); // Removed form.unidade_origem_id from dependency as it's set once based on user

  const handleAddItem = () => {
    if (!currentItem.lote_id || !currentItem.quantidade) {
      displayMessage("Selecione um lote e informe a quantidade.", "error");
      return;
    }

    const selectedLote = lotesPorUnidade[form.unidade_origem_id]?.find(
      (l) => l.id === parseInt(currentItem.lote_id)
    );

    if (!selectedLote) {
      displayMessage(
        "Lote não encontrado na unidade de origem selecionada. Verifique se a unidade de origem foi corretamente definida e se o lote existe nela.",
        "error"
      );
      return;
    }

    if (parseInt(currentItem.quantidade) <= 0) {
      displayMessage("A quantidade deve ser um número positivo.", "error");
      return;
    }

    if (parseInt(currentItem.quantidade) > selectedLote.quantidade_atual) {
      displayMessage(
        `Quantidade a agendar excede o estoque disponível no lote. Disponível: ${selectedLote.quantidade_atual}`,
        "error"
      );
      return;
    }

    // Check if the item (lote_id) is already added
    const existingItemIndex = form.itens.findIndex(
      (item) => item.lote_id === parseInt(currentItem.lote_id)
    );

    if (existingItemIndex > -1) {
      displayMessage("Este lote já foi adicionado ao agendamento.", "error");
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

    if (!form.unidade_destino_id) {
      displayMessage("Selecione a unidade de destino.", "error");
      return;
    }

    if (!form.unidade_origem_id) {
      displayMessage("Selecione a unidade de origem.", "error");
      return;
    }

    if (form.unidade_origem_id === form.unidade_destino_id) {
      displayMessage(
        "A unidade de origem não pode ser a mesma que a unidade de destino.",
        "error"
      );
      return;
    }

    try {
      const payload = {
        ...form,
        // Format for MySQL DATETIME, ensuring it's always in UTC to avoid timezone issues on backend
        data_agendamento: form.data_agendamento
          .toISOString()
          .slice(0, 19)
          .replace("T", " "),
      };
      await api.post("/agendamentos", payload);
      displayMessage("Agendamento criado com sucesso!", "success");
      setForm({
        unidade_origem_id: user?.unidade_id || "", // Reset to user's unit after submission
        unidade_destino_id: "",
        data_agendamento: null,
        observacao: "",
        itens: [],
      });
      setCurrentItem({ lote_id: "", quantidade: "" }); // Also reset current item
      fetchAgendamentos(); // Refresh the list of agendamentos
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        displayMessage(
          "Sessão expirada ou acesso não autorizado. Faça login novamente.",
          "error"
        );
        logout();
        navigate("/login");
      } else {
        displayMessage(
          `Erro ao criar agendamento: ${
            error.response?.data?.message || error.message
          }`,
          "error"
        );
      }
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
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        displayMessage(
          "Sessão expirada ou acesso não autorizado. Faça login novamente.",
          "error"
        );
        logout();
        navigate("/login");
      } else {
        displayMessage(
          `Erro ao atualizar status: ${
            error.response?.data?.message || error.message
          }`,
          "error"
        );
      }
    }
  };

  const availableLotes = lotesPorUnidade[form.unidade_origem_id] || [];
  const filteredAvailableLotes = availableLotes.filter((lote) => {
    const isExpired = new Date(lote.data_validade) < new Date();
    return lote.quantidade_atual > 0 && lote.status === "ativo" && !isExpired;
  });

  // Filter out the origin unit from the destination unit options
  const destinationUnidades = unidades.filter(
    (unit) => unit.id !== parseInt(form.unidade_origem_id)
  );

  // Display loading state while user is undefined (loading auth context) or component is fetching initial data
  if (isLoading || user === undefined) {
    return (
      <AgendamentosPageContainer>
        Carregando Agendamentos...
      </AgendamentosPageContainer>
    );
  }

  // If user is null (not authenticated after loading) or not almoxarife_central,
  // the useEffect will have already redirected them. This is a fallback/defensive check.
  if (user === null || user.tipo_usuario !== "almoxarife_central") {
    return null; // Or a simple message like "Acesso Negado."
  }

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

      <Card>
        <h4>
          <FaCalendarAlt /> Criar Novo Agendamento de Entrega
        </h4>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="unidade_origem">Unidade de Origem:</label>
            <select
              id="unidade_origem"
              value={form.unidade_origem_id}
              onChange={(e) => {
                setForm({
                  ...form,
                  unidade_origem_id: e.target.value,
                  itens: [],
                }); // Reset items when origin unit changes
                setCurrentItem({ lote_id: "", quantidade: "" }); // Reset current item
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
            <label htmlFor="unidade_destino">Unidade de Destino:</label>
            <select
              id="unidade_destino"
              value={form.unidade_destino_id}
              onChange={(e) =>
                setForm({ ...form, unidade_destino_id: e.target.value })
              }
              required
            >
              <option value="">Selecione a Unidade de Destino</option>
              {destinationUnidades.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="data_agendamento">
              Data e Hora do Agendamento:
            </label>
            <DatePicker
              id="data_agendamento"
              selected={form.data_agendamento}
              onChange={(date) => setForm({ ...form, data_agendamento: date })}
              showTimeSelect
              dateFormat="dd/MM/yyyy HH:mm"
              timeFormat="HH:mm"
              timeIntervals={15}
              placeholderText="Selecione a data e hora"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="observacao">Observação:</label>
            <textarea
              id="observacao"
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              rows="3"
              placeholder="Ex: Urgente, manusear com cuidado..."
            ></textarea>
          </div>

          <h5>Adicionar Itens ao Agendamento:</h5>
          <ItemFormContainer>
            <ItemFormRow>
              <ItemFormColumn flex={2}>
                <div className="form-group">
                  <label htmlFor="lote_id">Lote do Insumo:</label>
                  <select
                    id="lote_id"
                    value={currentItem.lote_id}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        lote_id: e.target.value,
                      })
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
              </ItemFormColumn>

              <ItemFormColumn flex={1}>
                <div className="form-group">
                  <label htmlFor="quantidade">Quantidade:</label>
                  <input
                    id="quantidade"
                    type="number"
                    value={currentItem.quantidade}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        // Ensure quantity is a positive integer
                        quantidade: Math.max(0, parseInt(e.target.value || 0)),
                      })
                    }
                    min="1"
                    max={
                      filteredAvailableLotes.find(
                        (l) => l.id === parseInt(currentItem.lote_id)
                      )?.quantidade_atual || ""
                    }
                    disabled={!currentItem.lote_id}
                  />
                </div>
              </ItemFormColumn>
            </ItemFormRow>

            <AddItemButton
              type="button"
              onClick={handleAddItem}
              disabled={
                !currentItem.lote_id ||
                !currentItem.quantidade ||
                parseInt(currentItem.quantidade) <= 0
              }
            >
              <FaPlus /> Adicionar Item
            </AddItemButton>
          </ItemFormContainer>

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
              <th>Ações</th>
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
                      ? schedule.itens_agendados.map((item, index) => (
                          <div key={index}>
                            {item.insumo_nome}: {item.quantidade} (Lote:{" "}
                            {item.numero_lote})
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
                            handleUpdateScheduleStatus(schedule.id, "concluido")
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
                            handleUpdateScheduleStatus(schedule.id, "cancelado")
                          }
                          title="Cancelar Agendamento"
                        >
                          Cancelar
                        </button>
                      )}
                    </ActionButtons>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">Nenhum agendamento encontrado.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableContainer>
    </AgendamentosPageContainer>
  );
};

export default Agendamentos;
