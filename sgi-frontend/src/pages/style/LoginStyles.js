import styled from "styled-components";
import { FaSignInAlt, FaLock, FaEnvelope } from "react-icons/fa";

export const LoginPageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1a3a 0%, #1a4b8c 100%);
  padding: 20px;
`;

export const LoginForm = styled.div`
  background-color: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 450px;
  text-align: center;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

export const Title = styled.h2`
  margin-bottom: 30px;
  font-size: 2.2em;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(to right, #0a1a3a, #1a4b8c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const InputGroup = styled.div`
  position: relative;
  margin-bottom: 25px;
  text-align: left;
`;

export const InputIconWrapper = styled.span`
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #1a4b8c;
  font-size: 1.1em;
`;

export const InputField = styled.input`
  width: 100%;
  padding: 14px 15px 14px 45px;
  border: 2px solid #d1e3f6;
  border-radius: 10px;
  font-size: 1em;
  transition: all 0.3s ease;
  background-color: #f0f7ff;
  
  &:focus {
    border-color: #1a4b8c;
    box-shadow: 0 0 0 3px rgba(26, 75, 140, 0.2);
    background-color: #fff;
    outline: none;
  }
  
  &::placeholder {
    color: #7a9cc6;
  }
`;

export const SubmitButton = styled.button`
  width: 100%;
  padding: 16px 20px;
  background: linear-gradient(to right, #0a1a3a, #1a4b8c);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
  box-shadow: 0 4px 15px rgba(10, 26, 58, 0.4);
  
  &:hover {
    background: linear-gradient(to right, #08152f, #153a6e);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(10, 26, 58, 0.5);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    background: #7a9cc6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export const ErrorMessage = styled.p`
  color: #ff4757;
  margin-top: 20px;
  font-size: 0.95em;
  padding: 10px;
  background-color: rgba(255, 71, 87, 0.1);
  border-radius: 8px;
  border-left: 4px solid #ff4757;
`;