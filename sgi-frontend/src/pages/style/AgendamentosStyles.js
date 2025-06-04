import styled from "styled-components";
import {
  FaCheckCircle,
  FaTruck,
  FaCalendarAlt,
  FaExchangeAlt,
  FaInfoCircle,
} from "react-icons/fa";

export const AgendamentosPageContainer = styled.div`
  padding: 30px;
  background-color: #f8faff;
  min-height: calc(100vh - 90px);
`;

export const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 40px;
  font-size: 2.8em;
  font-weight: 700;
`;

export const Card = styled.div`
  background-color: #fff;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  }

  h4 {
    color: #007bff;
    margin-bottom: 25px;
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 1.6em;
    font-weight: 600;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-weight: 600;
    color: #4a4a4a;
    font-size: 0.95em;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1em;
    color: #333;
    background-color: #fdfdff;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
      outline: none;
    }

    &:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }
  }

  .react-datepicker-wrapper {
    width: 100%;
  }

  .react-datepicker__input-container input {
    width: 100%;
  }

  .btn {
    width: 100%;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 1.1em;
    font-weight: 600;
    cursor: pointer;
    margin-top: 10px;
    transition: background-color 0.2s ease, transform 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;

    &:hover {
      transform: translateY(-2px);
    }
  }

  .btn-primary {
    background-color: #007bff;
    color: #fff;

    &:hover {
      background-color: #0056b3;
    }
  }
`;

export const AddedItemsList = styled.div`
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;

  h5 {
    margin-bottom: 15px;
    color: #333;
    font-size: 1.2em;
    font-weight: 600;
  }

  ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  li {
    background-color: #f9f9f9;
    border: 1px solid #eee;
    padding: 15px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.2s ease;
  }

  li:hover {
    background-color: #f0f0f0;
  }

  li button {
    background: none;
    border: none;
    color: #dc3545;
    cursor: pointer;
    font-size: 1.2em;
    transition: transform 0.2s ease;

    &:hover {
      transform: scale(1.2);
    }
  }
`;

export const TableContainer = styled.div`
  background-color: #fff;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  margin-top: 30px;
  overflow-x: auto;

  h3 {
    color: #2c3e50;
    margin-bottom: 25px;
    font-size: 2em;
    font-weight: 600;
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 20px;
  font-size: 0.95em;

  th,
  td {
    padding: 15px 20px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    background-color: #f0f4f7;
    color: #555;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.9em;
    letter-spacing: 0.5px;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background-color: #f5f9fc;
  }

  td {
    color: #666;
  }

  td:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }

  td:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }
`;

export const StatusPill = styled.span`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.85em;
  color: white;
  background-color: ${(props) => {
    switch (props.status) {
      case "pendente":
        return "#ffc107";
      case "em_transito":
        return "#17a2b8";
      case "concluido":
        return "#28a745";
      case "cancelado":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  }};
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 10px;

  button {
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.9em;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: transform 0.2s ease, opacity 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      opacity: 0.9;
    }

    &.btn-success {
      background-color: #28a745;
      color: white;
    }

    &.btn-info {
      background-color: #17a2b8;
      color: white;
    }

    &.btn-secondary {
      background-color: #6c757d;
      color: white;
    }
  }
`;

export const AddItemGroup = styled.div`
  display: flex;
  gap: 15px;
  align-items: flex-end;

  .form-group {
    flex: 1;
  }

  button {
    flex-shrink: 0;
    width: auto;
    padding: 12px 20px;
  }
`;

export const MessageContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 25px;
  font-size: 1.05em;
  font-weight: 500;
  gap: 12px;
  background-color: ${(props) =>
    props.type === "error" ? "#fdeaea" : "#e6f7ed"};
  color: ${(props) => (props.type === "error" ? "#dc3545" : "#28a745")};
  border: 1px solid
    ${(props) => (props.type === "error" ? "#f5c6cb" : "#b2dfdb")};

  svg {
    font-size: 1.5em;
    color: ${(props) => (props.type === "error" ? "#dc3545" : "#28a745")};
  }
`;