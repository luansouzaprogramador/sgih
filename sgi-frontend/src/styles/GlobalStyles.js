import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Poppins', sans-serif;
    background-color: #f8f9fa;
    color: #333;
    line-height: 1.6;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  ul {
    list-style: none;
  }

  button {
    cursor: pointer;
    border: none;
    background-color: transparent;
    font-family: 'Poppins', sans-serif;
  }

  input, select, textarea {
    font-family: 'Poppins', sans-serif;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    outline: none;
    transition: all 0.3s ease;
    &:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }
  }

  h1, h2, h3, h4, h5, h6 {
    color: #2c3e50;
  }

  /* Utility classes */
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .card {
    background-color: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    padding: 25px;
    margin-bottom: 20px;
  }

  .form-group {
    margin-bottom: 15px;
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #555;
    }
    input, select, textarea {
      width: 100%;
    }
  }

  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    &-primary {
      background-color: #007bff;
      color: #fff;
      &:hover {
        background-color: #0056b3;
      }
    }

    &-success {
      background-color: #28a745;
      color: #fff;
      &:hover {
        background-color: #218838;
      }
    }

    &-danger {
      background-color: #dc3545;
      color: #fff;
      &:hover {
        background-color: #c82333;
      }
    }

    &-info {
      background-color: #17a2b8;
      color: #fff;
      &:hover {
        background-color: #138496;
      }
    }

    &-warning {
      background-color: #ffc107;
      color: #212529;
      &:hover {
        background-color: #e0a800;
      }
    }

    &-secondary {
      background-color: #6c757d;
      color: #fff;
      &:hover {
        background-color: #5a6268;
      }
    }
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    background-color: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);

    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    th {
      background-color: #f2f4f7;
      font-weight: 600;
      color: #555;
      text-transform: uppercase;
      font-size: 0.9em;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    tbody tr:hover {
      background-color: #f9fbfd;
    }
  }
`;

export default GlobalStyles;