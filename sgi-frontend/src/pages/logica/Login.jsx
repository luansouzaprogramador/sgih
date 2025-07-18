import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaSignInAlt, FaLock, FaEnvelope } from "react-icons/fa";
import {
  LoginPageContainer,
  LoginForm,
  Title,
  InputGroup,
  InputIconWrapper,
  InputField,
  SubmitButton,
  ErrorMessage,
} from "../style/LoginStyles";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate("/painel");
      } else {
        setError(
          result.message || "Falha no login. Verifique suas credenciais."
        );
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado. Tente novamente mais tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginPageContainer>
      <LoginForm>
        <Title>Acesse o SGIH</Title>
        <form onSubmit={handleSubmit}>
          <InputGroup>
            <InputIconWrapper>
              <FaEnvelope />
            </InputIconWrapper>
            <InputField
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </InputGroup>
          <InputGroup>
            <InputIconWrapper>
              <FaLock />
            </InputIconWrapper>
            <InputField
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </InputGroup>
          <SubmitButton type="submit" disabled={isLoading}>
            <FaSignInAlt /> {isLoading ? "Carregando..." : "Entrar"}
          </SubmitButton>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </form>
      </LoginForm>
    </LoginPageContainer>
  );
};

export default Login;
