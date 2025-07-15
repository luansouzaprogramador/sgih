// Filename: EntradaInsumo.jsx
import React, { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FaPlus,
  FaMinus,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import {
  StockPageContainer,
  Title,
  ActionCard,
  ControlPanel,
  MessageContainer,
  Table,
} from "../style/EstoqueStyles";

const EntradaInsumo = () => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  // Estado para o formulário de entrada em lote (um array de objetos)
  const [entryForms, setEntryForms] = useState([
    {
      insumo_id: "",
      numero_lote: "",
      data_validade: null,
      quantidade: "",
      unidade_id: user?.unidade_id || "",
    },
  ]);

  const displayMessage = (message, type) => {
    setFeedbackMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setFeedbackMessage(null);
      setMessageType(null);
    }, 5000);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const insumosResponse = await api.get("/insumos");
        setInsumos(insumosResponse.data);

        let fetchedUnidades = [];
        if (user?.tipo_usuario === "almoxarife_central") {
          const unidadesResponse = await api.get("/unidades");
          fetchedUnidades = unidadesResponse.data;
          setUnidades(fetchedUnidades);
        } else if (user?.unidade_id) {
          // Para almoxarife local, sua unidade é a única relevante
          fetchedUnidades = [{ id: user.unidade_id, nome: "Sua Unidade" }];
          setUnidades(fetchedUnidades);
        }

        // Definir a unidade padrão para a primeira linha do formulário
        setEntryForms((prevForms) => {
          const firstForm = prevForms[0];
          let defaultUnitId = firstForm.unidade_id;

          if (user?.tipo_usuario === "almoxarife_local" && user.unidade_id) {
            defaultUnitId = user.unidade_id;
          } else if (user?.tipo_usuario === "almoxarife_central" && fetchedUnidades.length > 0) {
            // Se for almoxarife central e não houver unidade já selecionada, use a primeira unidade disponível
            if (!defaultUnitId) {
                defaultUnitId = fetchedUnidades[0].id;
            }
          }

          return prevForms.map((form, index) =>
            index === 0 ? { ...form, unidade_id: defaultUnitId } : form
          );
        });

      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        displayMessage(
          "Erro ao carregar dados iniciais (insumos/unidades).",
          "error"
        );
      }
    };

    fetchInitialData();
  }, [user]); // Depende do usuário para re-buscar dados se o usuário mudar

  const handleAddEntry = () => {
    // Determina a unidade_id padrão para a nova linha
    let defaultUnitIdForNewRow = "";
    if (user?.tipo_usuario === "almoxarife_local" && user.unidade_id) {
      defaultUnitIdForNewRow = user.unidade_id;
    } else if (user?.tipo_usuario === "almoxarife_central" && unidades.length > 0) {
      // Se for almoxarife central, use a unidade da última linha ou a primeira disponível
      const lastEntry = entryForms[entryForms.length - 1];
      defaultUnitIdForNewRow = lastEntry.unidade_id || unidades[0].id;
    }

    setEntryForms([
      ...entryForms,
      {
        insumo_id: "",
        numero_lote: "",
        data_validade: null,
        quantidade: "",
        unidade_id: defaultUnitIdForNewRow,
      },
    ]);
  };

  const handleRemoveEntry = (index) => {
    setEntryForms(entryForms.filter((_, i) => i !== index));
  };

  const handleInputChange = (index, event) => {
    const { name, value } = event.target;
    const newForms = [...entryForms];
    newForms[index][name] = value;
    setEntryForms(newForms);
  };

  const handleDateChange = (index, date) => {
    const newForms = [...entryForms];
    newForms[index].data_validade = date;
    setEntryForms(newForms);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validação básica para todas as entradas
    const invalidEntries = entryForms.filter(
      (entry) =>
        !entry.insumo_id ||
        !entry.numero_lote ||
        !entry.data_validade ||
        !entry.quantidade ||
        parseInt(entry.quantidade) <= 0 ||
        !entry.unidade_id
    );

    if (invalidEntries.length > 0) {
      displayMessage(
        "Por favor, preencha todos os campos obrigatórios e garanta que a quantidade seja maior que zero para todas as linhas.",
        "error"
      );
      return;
    }

    try {
      const formattedEntries = entryForms.map((entry) => ({
        ...entry,
        data_validade: entry.data_validade
          ? entry.data_validade.toISOString().split("T")[0]
          : null,
        quantidade: parseInt(entry.quantidade),
      }));

      const response = await api.post("/lotes/entrada-lote-em-massa", {
        entries: formattedEntries,
      });

      if (response.status === 200 || response.status === 206) {
        let successCount = 0;
        let errorMessages = [];

        response.data.results.forEach(result => {
          if (result.success) {
            successCount++;
          } else {
            errorMessages.push(result.message);
          }
        });

        if (successCount === entryForms.length) {
          displayMessage("Entrada(s) de insumo(s) registrada(s) com sucesso!", "success");
        } else if (successCount > 0) {
          displayMessage(
            `Algumas entradas foram registradas com sucesso (${successCount}/${entryForms.length}), mas ${entryForms.length - successCount} falharam: ${errorMessages.join('; ')}`,
            "info"
          );
        } else {
          displayMessage(
            `Nenhuma entrada pôde ser processada: ${errorMessages.join('; ')}`,
            "error"
          );
        }

        // Limpa o formulário ou redefine para uma única linha vazia
        setEntryForms([
          {
            insumo_id: "",
            numero_lote: "",
            data_validade: null,
            quantidade: "",
            unidade_id: user?.unidade_id || (user?.tipo_usuario === "almoxarife_central" && unidades.length > 0 ? unidades[0].id : ""),
          },
        ]);
      } else {
        displayMessage(
          response.data.message || "Erro desconhecido ao registrar entrada(s) de insumo(s).",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao registrar entrada em lote:", error);
      displayMessage(
        `Erro ao registrar entrada(s) de insumo(s): ${
          error.response?.data?.message || error.message || "Verifique o console para mais detalhes."
        }`,
        "error"
      );
    }
  };

  if (user?.tipo_usuario !== "almoxarife_central" && user?.tipo_usuario !== "almoxarife_local") {
    return (
      <StockPageContainer>
        <MessageContainer type="error">
          <FaExclamationCircle /> Você não tem permissão para acessar esta
          página.
        </MessageContainer>
      </StockPageContainer>
    );
  }

  return (
    <StockPageContainer>
      <Title>Registrar Entrada de Insumos (Em Lote)</Title>

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
          <h4>Registrar Novas Entradas</h4>
          <form onSubmit={handleSubmit}>
            <Table>
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Unidade</th>
                  <th>Número do Lote</th>
                  <th>Data de Validade</th>
                  <th>Quantidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {entryForms.map((entry, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        name="insumo_id"
                        value={entry.insumo_id}
                        onChange={(e) => handleInputChange(index, e)}
                        required
                      >
                        <option value="">Selecione o Insumo</option>
                        {insumos.map((insumo) => (
                          <option key={insumo.id} value={insumo.id}>
                            {insumo.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {user?.tipo_usuario === "almoxarife_central" ? (
                        <select
                          name="unidade_id"
                          value={entry.unidade_id}
                          onChange={(e) => handleInputChange(index, e)}
                          required
                        >
                          <option value="">Selecione a Unidade</option>
                          {unidades.map((unidade) => (
                            <option key={unidade.id} value={unidade.id}>
                              {unidade.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        // Para almoxarife local, exibe o nome da unidade e desabilita a seleção
                        <input
                          type="text"
                          value={unidades.find(u => u.id === user?.unidade_id)?.nome || 'Sua Unidade'}
                          disabled
                          style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        />
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        name="numero_lote"
                        value={entry.numero_lote}
                        onChange={(e) => handleInputChange(index, e)}
                        required
                      />
                    </td>
                    <td>
                      <DatePicker
                        selected={entry.data_validade}
                        onChange={(date) => handleDateChange(index, date)}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="DD/MM/AAAA"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        name="quantidade"
                        value={entry.quantidade}
                        onChange={(e) => handleInputChange(index, e)}
                        min="1"
                        required
                      />
                    </td>
                    <td>
                      {entryForms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEntry(index)}
                          style={{
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <FaMinus />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleAddEntry}
                style={{
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  padding: "10px 15px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                <FaPlus style={{ marginRight: "5px" }} /> Adicionar Linha
              </button>
              <button type="submit" className="btn btn-primary">
                Registrar Entrada(s)
              </button>
            </div>
          </form>
        </ActionCard>
      </ControlPanel>
    </StockPageContainer>
  );
};

export default EntradaInsumo;
