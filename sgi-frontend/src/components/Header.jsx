import React from "react";
import styled from "styled-components";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 250px; /* Aligned with sidebar width */
  width: calc(100% - 250px);
  background-color: #ffffff; /* Pure white for a crisp look */
  padding: 15px 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* Softer, more pronounced shadow */
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  border-bottom: 1px solid #e0e0e0; /* Subtle bottom border */
`;

const SystemTitle = styled.h2`
  color: #2c3e50; /* Darker, more premium text color */
  font-size: 1.6em; /* Slightly larger for prominence */
  margin: 0;
  font-weight: 600;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px; /* Slightly more space */
  font-weight: 500;
  color: #4a4a4a; /* Softer dark gray */

  svg {
    font-size: 26px; /* Slightly larger icon */
    color: #007bff;
  }
`;

const LogoutButton = styled.button`
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600; /* Bolder text for better readability */
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s ease-in-out, transform 0.2s ease;

  &:hover {
    color: #c82333;
    transform: translateY(-1px); /* Subtle lift on hover */
  }

  svg {
    font-size: 18px; /* Adjust icon size to match text */
  }
`;

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <HeaderContainer>
      <SystemTitle>
        SGIH - Sistema de Gerenciamento de Insumos Hospitalares
      </SystemTitle>
      <UserInfo>
        <FaUserCircle />
        <span>
          {user ? user.nome : "Guest"} ({user ? user.tipo_usuario : ""})
        </span>
        <LogoutButton onClick={logout}>
          <FaSignOutAlt /> Sair
        </LogoutButton>
      </UserInfo>
    </HeaderContainer>
  );
};

export default Header;
