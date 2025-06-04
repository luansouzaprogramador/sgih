import styled from "styled-components";

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

  h3 {
    color: #007bff;
    margin-bottom: 25px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.8em;
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
  .form-group select {
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
  }

  .btn-primary {
    background-color: #007bff;
    color: #fff;
    &:hover {
      background-color: #0056b3;
      transform: translateY(-2px);
    }
  }
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

export const FilterGroup = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  flex-wrap: wrap;
  align-items: center;

  select {
    flex: 1;
    min-width: 180px;
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
  }
`;

export const TableContainer = styled.div`
  background-color: #fff;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);

  h3 {
    color: #2c3e50;
    margin-bottom: 25px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.8em;
    font-weight: 600;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 15px;
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

export const StatusIndicator = styled.span`
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 5px;
  color: #fff;
  background-color: ${(props) => {
    switch (props.statusType) {
      case "red":
        return "#dc3545";
      case "orange":
        return "#ffc107";
      case "blue":
        return "#007bff";
      case "green":
        return "#28a745";
      default:
        return "#6c757d";
    }
  }};
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 8px;

  button {
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: background-color 0.2s ease, transform 0.2s ease;

    &.btn-info {
      background-color: #17a2b8;
      color: #fff;
      &:hover {
        background-color: #138496;
        transform: translateY(-1px);
      }
    }
    &.btn-success {
      background-color: #28a745;
      color: #fff;
      &:hover {
        background-color: #218838;
        transform: translateY(-1px);
      }
    }
    &.btn-secondary {
      background-color: #6c757d;
      color: #fff;
      &:hover {
        background-color: #5a6268;
        transform: translateY(-1px);
      }
    }
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

  ${(props) =>
    props.type === "success" &&
    `
    background-color: #e6f7ed;
    color: #28a745;
    border: 1px solid #b2dfdb;
    svg { color: #28a745; }
  `}

  ${(props) =>
    props.type === "error" &&
    `
    background-color: #fdeaea;
    color: #dc3545;
    border: 1px solid #f5c6cb;
    svg { color: #dc3545; }
  `}

  svg {
    font-size: 1.5em;
  }
`;

export const NoDataMessage = styled.p`
  text-align: center;
  color: #777;
  font-size: 1.1em;
  padding: 20px;
  background-color: #f0f0f0;
  border-radius: 8px;
`;