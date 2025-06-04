import styled from "styled-components";

export const ReportsPageContainer = styled.div`
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

export const ReportCard = styled.div`
  background-color: #fff;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;

  h4 {
    color: #007bff;
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

export const FilterGroup = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  flex-wrap: wrap;
  align-items: center;

  select,
  input[type="date"] {
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

  .btn-primary {
    background-color: #007bff;
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
      background-color: #0056b3;
      transform: translateY(-2px);
    }
  }
`;

export const TableContainer = styled.div`
  margin-top: 30px;
  overflow-x: auto; /* Ensures table is scrollable on small screens */

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    min-width: 800px; /* Ensure a minimum width for the table */

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
  }
`;

export const DownloadButton = styled.div`
  margin-top: 30px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: flex-end; /* Align buttons to the right */

  button {
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

    &.btn-csv {
      background-color: #28a745;
      color: #fff;
      &:hover {
        background-color: #218838;
        transform: translateY(-2px);
      }
    }
    &.btn-excel {
      background-color: #1e7045; /* Darker green for Excel */
      color: #fff;
      &:hover {
        background-color: #185a36;
        transform: translateY(-2px);
      }
    }
    &.btn-pdf {
      background-color: #dc3545;
      color: #fff;
      &:hover {
        background-color: #c82333;
        transform: translateY(-2px);
      }
    }
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