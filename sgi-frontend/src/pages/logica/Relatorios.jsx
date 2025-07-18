import React, { useState, useEffect, useCallback } from "react";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { MessageContainer } from "../style/UsuariosStyles";
import {
  FaFilePdf,
  FaFileCsv,
  FaChartLine,
  FaExclamationCircle,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import {
  ReportsPageContainer,
  Title,
  ReportCard,
  FilterGroup,
  TableContainer,
  DownloadButton,
  NoDataMessage,
} from "../style/RelatoriosStyles";

const Relatorios = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState("movimentacoes");
  const [movements, setMovements] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(user?.unidade_id || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    if (user?.tipo_usuario === "almoxarife_local" && user?.unidade_id) {
      setSelectedUnit(user.unidade_id);
      if (reportType === "movimentacoes") {
        fetchMovements(user.unidade_id, startDate, endDate);
      } else if (reportType === "estoque_critico") {
        fetchCriticalStock(user.unidade_id);
      }
    } else if (user?.tipo_usuario === "almoxarife_central") {
      if (reportType === "movimentacoes") {
        fetchMovements(selectedUnit, startDate, endDate);
      } else if (reportType === "estoque_critico") {
        fetchCriticalStock(selectedUnit);
      }
    }
  }, [reportType, selectedUnit, startDate, endDate, user]);

  const fetchUnits = async () => {
    try {
      const response = await api.get("/unidades");
      setUnits(response.data);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
    }
  };

  const fetchMovements = async (unitId, start, end) => {
    let url = "/movimentacoes";
    if (unitId && unitId !== "all") {
      url = `/movimentacoes/${unitId}`;
    }

    const params = new URLSearchParams();
    if (start) params.append("data_inicio", start);
    if (end) params.append("data_fim", end);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const response = await api.get(url);
      setMovements(response.data);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
      setMovements([]);
    }
  };

  const fetchCriticalStock = async (unitId) => {
    let url = "/alertas/estoque_critico";
    if (unitId && unitId !== "all") {
      url = `/alertas/estoque_critico/${unitId}`;
    }
    try {
      const response = await api.get(url);
      setMovements(response.data);
    } catch (error) {
      console.error("Erro ao carregar estoque crítico:", error);
      setMovements([]);
    }
  };

  const handleGenerateReport = () => {
    if (reportType === "movimentacoes") {
      fetchMovements(selectedUnit, startDate, endDate);
    } else if (reportType === "estoque_critico") {
      fetchCriticalStock(selectedUnit);
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      // Replaced alert with a custom message box for better UX
      displayMessage("Nenhum dado para exportar.", "error");
      return;
    }
    const header = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).join(","));
    const csvContent =
      "data:text/csv;charset=utf-8," + header + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = (data, filename) => {
    if (!data || data.length === 0) {
      // Replaced alert with a custom message box for better UX
      displayMessage("Nenhum dado para exportar.", "error");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportToPDF = () => {
    // Replaced alert with a custom message box for better UX
    displayMessage("Funcionalidade de exportar para PDF não implementada ainda.", "info");
  };

  // Function to display messages (similar to Agendamentos.jsx)
  const displayMessage = useCallback((message, type) => {
    setFeedbackMessage(message);
    setMessageType(type);
    const timer = setTimeout(() => {
      setFeedbackMessage(null);
      setMessageType(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  // Conditional rendering based on user type
  // Allow both almoxarife_central and almoxarife_local to access
  if (
    user?.tipo_usuario !== "almoxarife_central" &&
    user?.tipo_usuario !== "almoxarife_local"
  ) {
    return (
      <ReportsPageContainer>
        <MessageContainer type="error">
          <FaExclamationCircle /> Você não tem permissão para acessar esta
          página.
        </MessageContainer>
      </ReportsPageContainer>
    );
  }

  return (
    <ReportsPageContainer>
      <Title>Relatórios</Title>

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

      <ReportCard>
        <h4>
          <FaChartLine /> Gerar Relatório
        </h4>
        <FilterGroup>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="movimentacoes">Movimentações de Estoque</option>
            <option value="estoque_critico">Estoque Crítico</option>
          </select>

          {user?.tipo_usuario === "almoxarife_central" && (
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            >
              <option value="">Todas as Unidades</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.nome}
                </option>
              ))}
            </select>
          )}

          {reportType === "movimentacoes" && (
            <>
              <input
                type="date"
                placeholder="Data Início"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                placeholder="Data Fim"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </>
          )}
          <button onClick={handleGenerateReport} className="btn btn-primary">
            Gerar Relatório
          </button>
        </FilterGroup>

        <TableContainer>
          {movements.length === 0 && (
            <NoDataMessage>
              Nenhum dado para exibir. Selecione os filtros e clique em "Gerar
              Relatório".
            </NoDataMessage>
          )}

          {reportType === "movimentacoes" && movements.length > 0 && (
            <>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Data/Hora</th>
                    <th>Tipo</th>
                    <th>Insumo</th>
                    <th>Lote</th>
                    <th>Quantidade</th>
                    <th>Origem/Destino</th>
                    <th>Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.id}</td>
                      <td>{new Date(movement.data_hora).toLocaleString()}</td>
                      <td>{movement.tipo}</td>
                      <td>{movement.insumo_nome}</td>
                      <td>{movement.numero_lote || "N/A"}</td>
                      <td>{movement.quantidade}</td>
                      <td>
                        {movement.tipo === "entrada" &&
                          movement.unidade_destino_nome}
                        {movement.tipo === "saida" &&
                          movement.unidade_origem_nome}
                        {movement.tipo === "transferencia" &&
                          `${movement.unidade_origem_nome} -> ${movement.unidade_destino_nome}`}
                      </td>
                      <td>{movement.responsavel_nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <DownloadButton>
                <button
                  className="btn-csv"
                  onClick={() =>
                    exportToCSV(movements, "relatorio_movimentacoes")
                  }
                >
                  <FaFileCsv /> Exportar CSV
                </button>
                <button
                  className="btn-excel"
                  onClick={() =>
                    exportToExcel(movements, "relatorio_movimentacoes")
                  }
                >
                  <FaFileCsv /> Exportar Excel
                </button>
                <button className="btn-pdf" onClick={exportToPDF}>
                  <FaFilePdf /> Exportar PDF
                </button>
              </DownloadButton>
            </>
          )}

          {reportType === "estoque_critico" && movements.length > 0 && (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Unidade</th>
                    <th>Insumo</th>
                    <th>Qtd. Atual</th>
                    <th>ID Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((item) => (
                    <tr key={item.lote_id}>
                      <td>{item.unidade_nome}</td>
                      <td>{item.insumo_nome}</td>
                      <td>{item.quantidade_atual}</td>
                      <td>{item.lote_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <DownloadButton>
                <button
                  className="btn-csv"
                  onClick={() =>
                    exportToCSV(movements, "relatorio_estoque_critico")
                  }
                >
                  <FaFileCsv /> Exportar CSV
                </button>
                <button
                  className="btn-excel"
                  onClick={() =>
                    exportToExcel(movements, "relatorio_estoque_critico")
                  }
                >
                  <FaFileCsv /> Exportar Excel
                </button>
                <button className="btn-pdf" onClick={exportToPDF}>
                  <FaFilePdf /> Exportar PDF
                </button>
              </DownloadButton>
            </>
          )}
        </TableContainer>
      </ReportCard>
    </ReportsPageContainer>
  );
};

export default Relatorios;
