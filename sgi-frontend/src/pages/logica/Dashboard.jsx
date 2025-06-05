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
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        const insumosRes = await api.get("/insumos");
        const totalInsumos = insumosRes.data.length;

        const agendamentosEndpoint =
          user.tipo_usuario === "almoxarife_central"
            ? `/agendamentos/${user.unidade_id}`
            : "/agendamentos/";

        const agendamentosRes = await api.get(agendamentosEndpoint);
        const pendingDeliveries = agendamentosRes.data.filter(
          (a) => a.status === "pendente"
        ).length;

        const alertsRes = await api.get(`/alertas/${user.unidade_id}`);
        const criticalStockAlertsCount = alertsRes.data.filter(
          (a) => a.tipo === "estoque_critico"
        ).length;

        const movementsRes = await api.get(
          `/movimentacoes/${user.unidade_id}?periodo=30`
        );
        const recentMovements = movementsRes.data.slice(0, 5);

        setStats({
          totalInsumos,
          pendingDeliveries,
          criticalStockAlerts: criticalStockAlertsCount,
          recentMovements,
          alerts: alertsRes.data,
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading)
    return <DashboardContainer>Loading Dashboard...</DashboardContainer>;
  if (error)
    return (
      <DashboardContainer style={{ color: "red" }}>
        Error: {error}
      </DashboardContainer>
    );
  if (!user)
    return (
      <DashboardContainer>Please log in to view dashboard.</DashboardContainer>
    );

  return (
    <DashboardContainer>
      <WelcomeMessage>
        Bem-vindo, <span>{user.nome}!</span>
      </WelcomeMessage>

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
                  {alert.numero_lote && ` (Lote: ${alert.numero_lote})`}{" "}
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
        Últimas Movimentações na sua Unidade
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
    </DashboardContainer>
  );
};

export default Dashboard;
