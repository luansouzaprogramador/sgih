// Filename: Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  FaWarehouse,
  FaCalendarCheck,
  FaExclamationTriangle,
  FaArrowRight,
  FaArrowLeft,
} from "react-icons/fa";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import {
  DashboardContainer,
  WelcomeMessage,
  StatsGrid,
  StatCard,
  SectionTitle,
  Card,
  AlertList,
  AlertItem,
  Table,
  NoDataMessage,
} from "../style/DashboardStyles"; // Import styled components

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalInsumos: 0,
    pendingDeliveries: 0,
    criticalStockAlerts: 0,
    recentMovements: [],
    alerts: [],
    solicitacoes: [], // Changed from userRequests to solicitacoes to hold all types
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const isAlmoxarifeCentral = user.tipo_usuario === "almoxarife_central";
    const isAlmoxarifeLocal = user.tipo_usuario === "almoxarife_local";
    const isProfissionalSaude = user.tipo_usuario === "profissional_saude";
    const isGestor = user.tipo_usuario === "gestor";

    let totalInsumos = 0;
    let pendingDeliveries = 0;
    let criticalStockAlertsCount = 0;
    let recentMovements = [];
    let alerts = [];
    let fetchedSolicitacoes = []; // Variable to store fetched solicitations

    try {
      // Logic for 'almoxarife_local' and 'almoxarife_central'
      if (isAlmoxarifeLocal || isAlmoxarifeCentral) {
        const insumosRes = await api.get("/insumos");
        totalInsumos = insumosRes.data.length;

        // Almoxarife Local e Central chamam a rota geral /agendamentos
        // O backend já filtra com base no user.unidade_id do token
        const agendamentosRes = await api.get("/agendamentos");
        
        if (isAlmoxarifeCentral) {
          pendingDeliveries = agendamentosRes.data.filter(
            (a) => a.status === "pendente" || a.status === "em_transito"
          ).length;
        } else if (isAlmoxarifeLocal) {
          // Almoxarife Local só conta entregas pendentes para sua unidade como destino
          pendingDeliveries = agendamentosRes.data.filter(
            (a) => (a.status === "pendente" || a.status === "em_transito") && a.unidade_destino_id === user.unidade_id
          ).length;
        }


        try {
          // Chamada para alertas de estoque crítico
          const criticalStockResponse = await api.get(
            `/alertas/estoque_critico/${isAlmoxarifeCentral ? "all" : user.unidade_id}`
          );
          criticalStockAlertsCount = criticalStockResponse.data.length;
        } catch (err) {
          console.error("Erro ao carregar alertas de estoque crítico:", err);
        }

        // Chamada para alertas gerais
        const alertsEndpoint =
          isAlmoxarifeLocal
            ? `/alertas/${user.unidade_id}`
            : "/alertas/";
        const alertsRes = await api.get(alertsEndpoint);
        alerts = alertsRes.data;

        const movementsEndpoint =
          isAlmoxarifeLocal
            ? `/movimentacoes/${user.unidade_id}?periodo=7`
            : `/movimentacoes/?periodo=7`;
        const movementsRes = await api.get(movementsEndpoint);
        recentMovements = movementsRes.data.slice(0, 5);
      }

      // Fetch all solicitations (backend will filter by role/unit)
      // Only fetch if the user is a ProfissionalSaude or Gestor
      if (isProfissionalSaude || isGestor) {
        try {
          const solicitacoesResponse = await api.get('/solicitacoes');
          fetchedSolicitacoes = solicitacoesResponse.data;
        } catch (err) {
          console.error("Erro ao carregar solicitações:", err);
          setError("Erro ao carregar solicitações.");
        }
      }

      setStats({
        totalInsumos,
        pendingDeliveries,
        criticalStockAlerts: criticalStockAlertsCount,
        recentMovements,
        alerts,
        solicitacoes: fetchedSolicitacoes,
      });
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
      setError("Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]); // Depend on user to re-fetch if user changes

  // This function is no longer needed in Dashboard for almoxarifes,
  // but keeping it here as a placeholder if it were to be used by other roles.
  const handleUpdateSolicitationStatus = async (solicitacaoId, status) => {
    try {
      await api.put(`/solicitacoes/${solicitacaoId}/status`, { status });
      // Re-fetch data to update the table
      fetchDashboardData();
    } catch (err) {
      console.error(`Erro ao atualizar status da solicitação ${solicitacaoId} para ${status}:`, err);
      setError("Erro ao atualizar status da solicitação.");
    }
  };

  if (loading)
    return <DashboardContainer>Carregando Dashboard...</DashboardContainer>;
  if (error)
    return (
      <DashboardContainer style={{ color: "red" }}>
        Erro: {error}
      </DashboardContainer>
    );
  if (!user)
    return (
      <DashboardContainer>Por favor, faça login para ver o dashboard.</DashboardContainer>
    );

  const isAlmoxarifeCentral = user.tipo_usuario === "almoxarife_central";
  const isAlmoxarifeLocal = user.tipo_usuario === "almoxarife_local";
  const isProfissionalSaude = user.tipo_usuario === "profissional_saude";
  const isGestor = user.tipo_usuario === "gestor";


  return (
    <DashboardContainer>
      <WelcomeMessage>
        Bem-vindo, <span>{user.nome}!</span>
      </WelcomeMessage>

      {/* Seção para Profissional da Saúde E Gestor: Minhas Solicitações de Insumos */}
      {(isProfissionalSaude || isGestor) && (
        <>
          <SectionTitle>Minhas Solicitações de Insumos</SectionTitle>
          <Card>
            {stats.solicitacoes && stats.solicitacoes.length > 0 ? (
              <Table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Insumo</th>
                    <th>Quantidade</th>
                    <th>Status</th>
                    <th>Data da Solicitação</th>
                    <th>Unidade Solicitante</th> {/* Added this for completeness, though it's "my" unit */}
                  </tr>
                </thead>
                <tbody>
                  {stats.solicitacoes.map((request) => (
                    <tr key={request.id}>
                      <td>{request.id}</td>
                      <td>{request.insumo_nome}</td>
                      <td>{request.quantidade}</td>
                      <td>{request.status}</td>
                      <td>{new Date(request.data_solicitacao).toLocaleString()}</td>
                      <td>{request.unidade_solicitante_nome}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <NoDataMessage>
                Você não possui solicitações de insumos registradas.
              </NoDataMessage>
            )}
          </Card>
        </>
      )}

      {/* Seção para Almoxarife Local e Central (Visão Geral, Alertas Ativos, Movimentações Recentes) */}
      {(isAlmoxarifeLocal || isAlmoxarifeCentral) && (
          <>
            <SectionTitle>Visão Geral</SectionTitle>
            <StatsGrid>
              <StatCard color="#007bff">
                <FaWarehouse className="icon" />
                <div className="value">{stats.totalInsumos}</div>
                <div className="label">Total de Insumos</div>
              </StatCard>
              <StatCard color="#28a745">
                <FaCalendarCheck className="icon" />
                <div className="value">{stats.pendingDeliveries}</div>
                <div className="label">Entregas Pendentes</div>
              </StatCard>
              <StatCard color="#ffc107">
                <FaExclamationTriangle className="icon" />
                <div className="value">{stats.criticalStockAlerts}</div>
                <div className="label">Alertas de Estoque Crítico</div>
              </StatCard>
            </StatsGrid>

            {/* A seção de Solicitações de Insumos foi movida para a página de Saída de Insumo para almoxarifes locais */}
            {/* e removida do dashboard para almoxarifes centrais. */}

            {/* Keep existing sections below requests table */}
            <SectionTitle>Alertas Ativos</SectionTitle>
            <Card>
              {stats.alerts.length > 0 ? (
                <AlertList>
                  {stats.alerts.map((alert) => (
                    <AlertItem key={alert.id}>
                      <FaExclamationTriangle />
                      <div>
                        <strong>
                          {alert.tipo === "vencimento"
                            ? "Vencimento"
                            : alert.tipo === "estoque_critico"
                              ? "Estoque Crítico"
                              : "Alerta"}
                        </strong>
                        : {alert.mensagem}
                        {alert.insumo_nome && ` (Insumo: ${alert.insumo_nome})`}
                        {alert.numero_lote &&
                          ` (Lote: ${alert.numero_lote})`}{" "}
                        <small>
                          ({new Date(alert.data_alerta).toLocaleString()})
                        </small>
                      </div>
                    </AlertItem>
                  ))}
                </AlertList>
              ) : (
                <NoDataMessage>Nenhum alerta ativo no momento.</NoDataMessage>
              )}
            </Card>

            <SectionTitle style={{ marginTop: "40px" }}>
              Últimas Movimentações{" "}
              {isAlmoxarifeLocal && "na sua Unidade"}
            </SectionTitle>
            <Card>
              {stats.recentMovements.length > 0 ? (
                <Table>
                  <thead>
                    <tr>
                      <th>Data/Hora</th>
                      <th>Tipo</th>
                      <th>Insumo</th>
                      <th>Lote</th>
                      <th>Quantidade</th>
                      <th>Responsável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{new Date(movement.data_hora).toLocaleString()}</td>
                        <td>
                          {movement.tipo === "entrada" ? (
                            <>
                              <FaArrowRight
                                style={{ color: "#28a745", marginRight: "5px" }}
                              />{" "}
                              Entrada
                            </>
                          ) : movement.tipo === "saida" ? (
                            <>
                              <FaArrowLeft
                                style={{ color: "#dc3545", marginRight: "5px" }}
                              />{" "}
                              Saída
                            </>
                          ) : (
                            "Transferência"
                          )}
                        </td>
                        <td>{movement.insumo_nome}</td>
                        <td>{movement.numero_lote}</td>
                        <td>{movement.quantidade}</td>
                        <td>{movement.responsavel_nome}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <NoDataMessage>
                  Nenhuma movimentação recente registrada.
                </NoDataMessage>
              )}
            </Card>
          </>
      )}
    </DashboardContainer>
  );
};

export default Dashboard;
