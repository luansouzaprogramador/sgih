import React, { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FaPlus,
  FaMinus,
  FaSearch,
  FaSyncAlt,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import {
  StockPageContainer,
  Title,
  ControlPanel,
  ActionCard,
  StockTableContainer,
  FilterGroup,
  Table,
  StatusIndicator,
  MessageContainer,
  NoDataMessage,
} from "../style/EstoqueStyles"; // Import styled components

const Estoque = () => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(user?.unidade_id || "");

  // Messages state
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // 'success', 'error', 'info'

  // Add/Remove forms state
  const [addForm, setAddForm] = useState({
    insumo_id: "",
    numero_lote: "",
    data_validade: null,
    quantidade: "",
    unidade_id: user?.unidade_id || "",
  });

  const [removeForm, setRemoveForm] = useState({
    lote_id: "",
    quantidade_saida: "",
    unidade_origem_id: user?.unidade_id || "",
  });

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnit, setFilterUnit] = useState(user?.unidade_id || ""); // Filter by unit for managers

  const displayMessage = (message, type) => {
    setFeedbackMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setFeedbackMessage(null);
      setMessageType(null);
    }, 5000); // Message disappears after 5 seconds
  };

  const fetchInsumos = async () => {
    try {
      const response = await api.get("/insumos");
      setInsumos(response.data);
    } catch (error) {
      console.error("Error fetching insumos:", error);
      displayMessage("Erro ao carregar insumos.", "error");
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get("/unidades");
      setUnidades(response.data);
    } catch (error) {
      console.error("Error fetching units:", error);
      displayMessage("Erro ao carregar unidades.", "error");
    }
  };

  const fetchLotes = async (unitId) => {
    if (!unitId && user?.tipo_usuario !== "gerente_estoque") {
      setLotes([]);
      return;
    }
    try {
      const endpoint =
        unitId && unitId !== "all" ? `/lotes/${unitId}` : "/lotes"; // Assuming /lotes returns all for manager
      const response = await api.get(endpoint);
      setLotes(response.data);
    } catch (error) {
      console.error("Error fetching lotes:", error);
      displayMessage(
        "Erro ao carregar lotes. Verifique suas permissões ou a unidade selecionada.",
        "error"
      );
      setLotes([]);
    }
  };

  useEffect(() => {
    fetchInsumos();
    fetchUnits();
    if (user?.unidade_id) {
      fetchLotes(user.unidade_id);
      setSelectedUnit(user.unidade_id);
      setAddForm((prev) => ({ ...prev, unidade_id: user.unidade_id }));
      setRemoveForm((prev) => ({
        ...prev,
        unidade_origem_id: user.unidade_id,
      }));
      setFilterUnit(user.unidade_id); // Set filter for estoquista to their unit
    } else if (user?.tipo_usuario === "gerente_estoque") {
      setFilterUnit(""); // Default to no specific unit filter for manager (fetches all if backend supports)
      fetchLotes(""); // Fetch all lots for manager by default if API supports
    }
  }, [user]);

  useEffect(() => {
    const unitToFetch =
      user?.tipo_usuario === "gerente_estoque" ? filterUnit : selectedUnit;
    fetchLotes(unitToFetch);
  }, [filterUnit, selectedUnit, user]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...addForm,
        data_validade: addForm.data_validade
          ? addForm.data_validade.toISOString().split("T")[0]
          : null,
        quantidade: parseInt(addForm.quantidade),
      };
      await api.post("/lotes/entrada", payload);
      displayMessage("Entrada de insumo registrada com sucesso!", "success");
      setAddForm({
        insumo_id: "",
        numero_lote: "",
        data_validade: null,
        quantidade: "",
        unidade_id: user?.unidade_id || "",
      });
      fetchLotes(
        user?.tipo_usuario === "gerente_estoque" ? filterUnit : selectedUnit
      ); // Refresh data
    } catch (error) {
      console.error("Erro ao adicionar insumo:", error);
      displayMessage(
        `Erro ao registrar entrada de insumo: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const handleRemoveSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...removeForm,
        quantidade_saida: parseInt(removeForm.quantidade_saida),
      };
      await api.post("/lotes/saida", payload);
      displayMessage("Saída de insumo registrada com sucesso!", "success");
      setRemoveForm({
        lote_id: "",
        quantidade_saida: "",
        unidade_origem_id: user?.unidade_id || "",
      });
      fetchLotes(
        user?.tipo_usuario === "gerente_estoque" ? filterUnit : selectedUnit
      ); // Refresh data
    } catch (error) {
      console.error("Erro ao remover insumo:", error);
      displayMessage(
        `Erro ao registrar saída de insumo: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
    }
  };

  const getStatus = (lote) => {
    const isExpired = new Date(lote.data_validade) < new Date();
    if (lote.status === "bloqueado") {
      return "Bloqueado";
    }
    if (isExpired) {
      return "Vencido";
    }
    if (lote.quantidade_atual < 20) {
      return "Baixo";
    }
    return "Ativo";
  };

  const filteredLotes = lotes.filter(
    (lote) =>
      lote.insumo_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lote.numero_lote.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <StockPageContainer>
      <Title>Gestão de Estoque</Title>

      {feedbackMessage && (
        <MessageContainer type={messageType}>
          {messageType === "success" && <FaCheckCircle />}
          {messageType === "error" && <FaExclamationCircle />}
          {messageType === "info" && <FaInfoCircle />}
          {feedbackMessage}
        </MessageContainer>
      )}

      <ControlPanel>
        <ActionCard>
          <h4>
            <FaPlus /> Registrar Entrada de Insumo
          </h4>
          <form onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label>Unidade Hospitalar:</label>
              <select
                value={addForm.unidade_id}
                onChange={(e) =>
                  setAddForm({ ...addForm, unidade_id: e.target.value })
                }
                disabled={user?.tipo_usuario === "estoquista"}
                required
              >
                <option value="">Selecione a Unidade</option>
                {unidades.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Insumo:</label>
              <select
                value={addForm.insumo_id}
                onChange={(e) =>
                  setAddForm({ ...addForm, insumo_id: e.target.value })
                }
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
              <label>Número do Lote:</label>
              <input
                type="text"
                value={addForm.numero_lote}
                onChange={(e) =>
                  setAddForm({ ...addForm, numero_lote: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Data de Validade:</label>
              <DatePicker
                selected={addForm.data_validade}
                onChange={(date) =>
                  setAddForm({ ...addForm, data_validade: date })
                }
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecione a data"
                required
              />
            </div>
            <div className="form-group">
              <label>Quantidade:</label>
              <input
                type="number"
                value={addForm.quantidade}
                onChange={(e) =>
                  setAddForm({ ...addForm, quantidade: e.target.value })
                }
                min="1"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Registrar Entrada
            </button>
          </form>
        </ActionCard>

        <ActionCard>
          <h4>
            <FaMinus /> Registrar Saída de Insumo
          </h4>
          <form onSubmit={handleRemoveSubmit}>
            <div className="form-group">
              <label>Unidade Hospitalar:</label>
              <select
                value={removeForm.unidade_origem_id}
                onChange={(e) =>
                  setRemoveForm({
                    ...removeForm,
                    unidade_origem_id: e.target.value,
                  })
                }
                disabled={user?.tipo_usuario === "estoquista"}
                required
              >
                <option value="">Selecione a Unidade</option>
                {unidades.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Lote do Insumo (ID):</label>
              <select
                value={removeForm.lote_id}
                onChange={(e) =>
                  setRemoveForm({ ...removeForm, lote_id: e.target.value })
                }
                required
              >
                <option value="">Selecione o Lote</option>
                {lotes
                  .filter(
                    (l) =>
                      l.unidade_id ===
                      parseInt(
                        user?.tipo_usuario === "gerente_estoque"
                          ? removeForm.unidade_origem_id
                          : selectedUnit
                      )
                  )
                  .map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.numero_lote} ({lote.insumo_nome}) - Qtd:{" "}
                      {lote.quantidade_atual}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantidade de Saída:</label>
              <input
                type="number"
                value={removeForm.quantidade_saida}
                onChange={(e) =>
                  setRemoveForm({
                    ...removeForm,
                    quantidade_saida: e.target.value,
                  })
                }
                min="1"
                required
              />
            </div>
            <button type="submit" className="btn btn-danger">
              Registrar Saída
            </button>
          </form>
        </ActionCard>
      </ControlPanel>

      <StockTableContainer>
        <FilterGroup>
          <input
            type="text"
            placeholder="Buscar por insumo ou lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
          <button
            className="btn btn-secondary"
            onClick={() => fetchLotes(filterUnit || selectedUnit)}
          >
            <FaSyncAlt /> Atualizar
          </button>
        </FilterGroup>
        <Table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Lote</th>
              <th>Quantidade Atual</th>
              <th>Data de Validade</th>
              <th>Unidade Medida</th>
              <th>Status</th>
              <th>Local de Armazenamento</th>
            </tr>
          </thead>
          <tbody>
            {filteredLotes.length > 0 ? (
              filteredLotes.map((lote) => (
                <tr key={lote.id}>
                  <td>{lote.insumo_nome}</td>
                  <td>{lote.numero_lote}</td>
                  <td>{lote.quantidade_atual}</td>
                  <td>{new Date(lote.data_validade).toLocaleDateString()}</td>
                  <td>
                    {
                      insumos.find((i) => i.id === lote.insumo_id)
                        ?.unidade_medida
                    }
                  </td>
                  <td>
                    <StatusIndicator $statusType={getStatus(lote)}>
                      {getStatus(lote)}
                    </StatusIndicator>
                  </td>
                  <td>
                    {insumos.find((i) => i.id === lote.insumo_id)
                      ?.local_armazenamento || "N/A"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">
                  <NoDataMessage>
                    Nenhum lote encontrado para esta unidade ou com os filtros
                    aplicados.
                  </NoDataMessage>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </StockTableContainer>
    </StockPageContainer>
  );
};

export default Estoque;
