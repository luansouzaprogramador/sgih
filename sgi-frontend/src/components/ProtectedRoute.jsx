import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import styled from "styled-components";

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f8faff; /* Lighter, more modern background */
`;

const ContentArea = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: 30px; /* Increased padding for more breathing room */
  margin-left: 250px; /* Adjust based on sidebar width */
  padding-top: 90px; /* More space for fixed header */
`;

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth(); // Destructure loading from useAuth

  if (loading) {
    return (
      <LayoutContainer
        style={{
          justifyContent: "center",
          alignItems: "center",
          fontSize: "1.2em",
          color: "#555",
        }}
      >
        Loading application...
      </LayoutContainer>
    ); // Show loading state
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.tipo_usuario))) {
    return <Navigate to="/dashboard" replace />; // Redirect if role is not allowed
  }

  return (
    <LayoutContainer>
      <Sidebar />
      <Header /> {/* Header is inside layout to cover ContentArea */}
      <ContentArea>
        <Outlet /> {/* Renders the child route components */}
      </ContentArea>
    </LayoutContainer>
  );
};

export default ProtectedRoute;
