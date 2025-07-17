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
} from "../style/EstoqueStyles"; // Reutilizando estilos existentes

// Constante para o ID da unidade central (agora uma unidade própria)
const CENTRAL_UNIT_ID = 5; // ID da nova unidade 'Almoxarifado Central FHEMIG'

const EntradaInsumoCentral = () => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  // Estado para o formulário de entrada em lote (um array de objetos)
  const [entryForms, setEntryForms] = useState([
    {
      insumo_id: "",
      numero_lote: "",
      data_validade: null,
      quantidade: "",
      unidade_id: CENTRAL_UNIT_ID, // Sempre preenchido com a unidade central
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

        // Garante que o primeiro formulário sempre use a CENTRAL_UNIT_ID
        setEntryForms((prevForms) =>
          prevForms.map((form, index) =>
            index === 0 ? { ...form, unidade_id: CENTRAL_UNIT_ID } : form
          )
        );

      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        displayMessage(
          "Erro ao carregar dados iniciais (insumos).",
          "error"
        );
      }
    };

    fetchInitialData();
  }, [user]); // Depende do usuário para re-buscar dados se o usuário mudar

  const handleAddEntry = () => {
    setEntryForms([
      ...entryForms,
      {
        insumo_id: "",
        numero_lote: "",
        data_validade: null,
        quantidade: "",
        unidade_id: CENTRAL_UNIT_ID, // Sempre a unidade central
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

      // A rota de entrada em massa já existe e pode ser reutilizada
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
          displayMessage("Entrada(s) de insumo(s) registrada(s) com sucesso no estoque central!", "success");
        } else if (successCount > 0) {
          displayMessage(
            `Algumas entradas foram registradas com sucesso (${successCount}/${entryForms.length}) no estoque central, mas ${entryForms.length - successCount} falharam: ${errorMessages.join('; ')}`,
            "info"
          );
        } else {
          displayMessage(
            `Nenhuma entrada pôde ser processada para o estoque central: ${errorMessages.join('; ')}`,
            "error"
          );
        }

        setEntryForms([
          {
            insumo_id: "",
            numero_lote: "",
            data_validade: null,
            quantidade: "",
            unidade_id: CENTRAL_UNIT_ID, // Redefine para a unidade central
          },
        ]);
      } else {
        displayMessage(
          response.data.message || "Erro desconhecido ao registrar entrada(s) de insumo(s) no estoque central.",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao registrar entrada em lote no estoque central:", error);
      displayMessage(
        `Erro ao registrar entrada(s) de insumo(s) no estoque central: ${
          error.response?.data?.message || error.message || "Verifique o console para mais detalhes."
        }`,
        "error"
      );
    }
  };

  if (user?.tipo_usuario !== "almoxarife_central") {
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
      <Title>Registrar Entrada de Insumos (Estoque Central)</Title>

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
          <h4>Registrar Novas Entradas no Estoque Central</h4>
          <form onSubmit={handleSubmit}>
            <Table>
              <thead>
                <tr>
                  <th>Insumo</th>
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

export default EntradaInsumoCentral;
