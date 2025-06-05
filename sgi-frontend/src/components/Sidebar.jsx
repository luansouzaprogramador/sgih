import React from "react";
import styled from "styled-components";
import { Link, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaWarehouse,
  FaCalendarAlt,
  FaChartBar,
  FaCogs,
  FaPrescriptionBottleAlt,
  FaHospitalAlt,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

const SidebarContainer = styled.aside`
  width: 250px;
  background-color: #2a3b4c; /* Deeper, richer blue-grey */
  color: #e6e6e6; /* Lighter text for contrast */
  padding: 20px 0; /* Adjusted padding for better flow */
  position: fixed;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2); /* Stronger, more elegant shadow */
  z-index: 1001; /* Higher than header to stay on top */
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 50px; /* More space below logo */
  img {
    max-width: 80px;
    margin-bottom: 10px;
  }
  h1 {
    color: #ffffff; /* Pure white for logo text */
    font-size: 2em; /* Larger, more impactful logo text */
    font-weight: 700;
    letter-spacing: 1px; /* Subtle letter spacing */
  }
  p {
    font-size: 0.95em;
    color: #b0c4de; /* Slightly lighter descriptive text */
    margin-top: 5px;
  }
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0 20px; /* Padding for the list items */
`;

const NavItem = styled.li`
  margin-bottom: 8px; /* Slightly less margin for denser list */
  a {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 14px 15px; /* More vertical padding */
    color: #e6e6e6;
    font-size: 1.05em; /* Slightly adjusted font size */
    border-radius: 8px;
    transition: background-color 0.3s ease, color 0.3s ease, transform 0.2s ease;
    text-decoration: none; /* Ensure no underline */

    &:hover {
      background-color: #3a4b5c; /* Lighter shade on hover */
      color: #ffffff;
      transform: translateX(3px); /* Subtle slide effect on hover */
    }

    &.active {
      background-color: #007bff; /* Primary color for active */
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3); /* More pronounced shadow for active */
      position: relative; /* For the active indicator */
      overflow: hidden;

      &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 5px;
        background-color: #28a745; /* A vibrant accent color */
        border-radius: 8px 0 0 8px;
      }
    }

    svg {
      font-size: 1.4em; /* Slightly larger icons */
    }
  }
`;

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isManager = user && user.tipo_usuario === "gerente_estoque";

  return (
    <SidebarContainer>
      <Logo>
        {/* <img src="/logo.png" alt="SGIH Logo" /> */}
        <h1>SGIH</h1>
        <p>Gestão de Insumos</p>
      </Logo>
      <NavList>
        <NavItem>
          <Link
            to="/dashboard"
            className={location.pathname === "/dashboard" ? "active" : ""}
          >
            <FaTachometerAlt /> Dashboard
          </Link>
        </NavItem>
        <NavItem>
          <Link
            to="/estoque"
            className={location.pathname === "/estoque" ? "active" : ""}
          >
            <FaWarehouse /> Estoque
          </Link>
        </NavItem>
        <NavItem>
          <Link
            to="/agendamentos"
            className={location.pathname === "/agendamentos" ? "active" : ""}
          >
            <FaCalendarAlt /> Agendamentos
          </Link>
        </NavItem>
        {isManager && ( // Conditionally render based on user type
          <NavItem>
            <Link
              to="/relatorios"
              className={location.pathname === "/relatorios" ? "active" : ""}
            >
              <FaChartBar /> Relatórios
            </Link>
          </NavItem>
        )}
        <NavItem>
          <Link
            to="/insumos"
            className={location.pathname === "/insumos" ? "active" : ""}
          >
            <FaPrescriptionBottleAlt /> Gerenciar Insumos
          </Link>
        </NavItem>
        {isManager && (
          <NavItem>
            <Link
              to="/unidades"
              className={location.pathname === "/unidades" ? "active" : ""}
            >
              <FaHospitalAlt /> Gerenciar Unidades
            </Link>
          </NavItem>
        )}
        {isManager && (
          <NavItem>
            <Link
              to="/configuracoes"
              className={location.pathname === "/configuracoes" ? "active" : ""}
            >
              <FaCogs /> Configurações
            </Link>
          </NavItem>
        )}
      </NavList>
    </SidebarContainer>
  );
};

export default Sidebar;
