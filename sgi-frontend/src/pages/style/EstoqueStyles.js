import styled from "styled-components";

export const StockPageContainer = styled.div`
  padding: 30px;
  background-color: #f8faff; /* Light background to match the dashboard */
  min-height: calc(100vh - 90px); /* Adjust to fill remaining height */
`;

export const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 40px; /* More space below title */
  font-size: 2.8em; /* Larger title for prominence */
  font-weight: 700;
`;

export const ControlPanel = styled.div`
  display: grid; /* Use grid for better responsiveness */
  grid-template-columns: repeat(
    auto-fit,
    minmax(400px, 1fr)
  ); /* Wider columns */
  gap: 30px; /* Increased gap */
  margin-bottom: 40px;
`;

export const ActionCard = styled.div`
  background-color: #fff;
  padding: 30px; /* More padding */
  border-radius: 15px; /* Softer corners */
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); /* More prominent, softer shadow */
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-8px); /* Subtle lift on hover */
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12); /* Enhanced shadow on hover */
  }

  h4 {
    color: #007bff;
    margin-bottom: 25px; /* More space below heading */
    display: flex;
    align-items: center;
    gap: 15px; /* More space for icon */
    font-size: 1.6em; /* Larger heading */
    font-weight: 600;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 20px; /* Increased gap between form groups */
    width: 100%;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px; /* Space between label and input */
  }

  .form-group label {
    font-weight: 600; /* Bolder label */
    color: #4a4a4a; /* Softer dark gray */
    font-size: 0.95em;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 12px 15px; /* More padding */
    border: 1px solid #e0e0e0; /* Lighter border */
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
    width: 100%; /* Ensure DatePicker input takes full width */
  }

  .btn {
    width: 100%; /* Full width buttons */
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 1.1em;
    font-weight: 600;
    cursor: pointer;
    margin-top: 10px; /* Space above button */
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

  .btn-danger {
    background-color: #dc3545;
    color: #fff;
    &:hover {
      background-color: #c82333;
      transform: translateY(-2px);
    }
  }
`;

export const StockTableContainer = styled.div`
  background-color: #fff;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  margin-top: 30px;
`;

export const FilterGroup = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 25px; /* More space */
  flex-wrap: wrap;
  align-items: center;

  input,
  select {
    flex: 1;
    min-width: 200px; /* Minimum width for filter inputs */
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

  .btn-secondary {
    background-color: #6c757d;
    color: #fff;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 1.1em;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background-color 0.2s ease, transform 0.2s ease;

    &:hover {
      background-color: #5a6268;
      transform: translateY(-2px);
    }
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: separate; /* Allows border-radius on cells */
  border-spacing: 0;
  margin-top: 20px;
  font-size: 0.95em;

  th,
  td {
    padding: 15px 20px; /* More padding */
    text-align: left;
    border-bottom: 1px solid #eee; /* Light separator */
  }

  th {
    background-color: #f0f4f7; /* Light blue-grey for headers */
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
    background-color: #f5f9fc; /* Subtle hover effect */
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
      case "Vencido":
      case "Bloqueado":
        return "#dc3545"; // Red
      case "Baixo":
        return "#ffc107"; // Orange/Yellow
      case "Ativo":
      default:
        return "#28a745"; // Green
    }
  }};
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

  ${(props) =>
    props.type === "info" &&
    `
    background-color: #e7f3ff;
    color: #007bff;
    border: 1px solid #b8daff;
    svg { color: #007bff; }
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