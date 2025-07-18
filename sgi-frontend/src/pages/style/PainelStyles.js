import styled from "styled-components";

export const PainelContainer = styled.div`
  padding: 30px;
  background-color: #f8faff; /* Light background to match layout */
  min-height: calc(100vh - 90px); /* Adjust to fill remaining height */
`;

export const WelcomeMessage = styled.h1`
  color: #2c3e50;
  margin-bottom: 40px;
  font-size: 2.8em; /* Slightly larger for a grander welcome */
  font-weight: 700;
  span {
    color: #007bff;
  }
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Wider cards */
  gap: 30px; /* Increased gap */
  margin-bottom: 40px;
`;

export const StatCard = styled.div`
  background-color: #fff;
  padding: 30px; /* More padding */
  border-radius: 15px; /* Softer corners */
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); /* More prominent, softer shadow */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px; /* More space between elements */
  border-left: 6px solid ${(props) => props.color}; /* Thicker border */
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden; /* Ensures shadow is within bounds */

  &:hover {
    transform: translateY(-8px); /* More pronounced lift */
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12); /* Enhanced shadow on hover */
  }

  .icon {
    font-size: 3.5em; /* Larger icons */
    color: ${(props) => props.color};
    margin-bottom: 10px;
  }

  .value {
    font-size: 2.8em; /* Larger value */
    font-weight: 700;
    color: #333;
    line-height: 1; /* Tighter line height */
  }

  .label {
    font-size: 1.2em; /* Larger label */
    color: #555;
    font-weight: 500;
  }
`;

export const SectionTitle = styled.h3`
  color: #2c3e50;
  margin-bottom: 25px;
  font-size: 2em; /* Larger section titles */
  border-bottom: 2px solid #e0e0e0; /* Lighter border */
  padding-bottom: 12px;
  font-weight: 600;
`;

export const Card = styled.div`
  background-color: #fff;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px; /* Space between cards */
`;

export const AlertList = styled.ul`
  list-style: none;
  padding: 0;
`;

export const AlertItem = styled.li`
  background-color: #fef3f3; /* Very light red */
  border: 1px solid #fccdcd; /* Slightly darker red border */
  color: #c0392b; /* Darker red text */
  padding: 18px 20px; /* More padding */
  margin-bottom: 12px;
  border-radius: 10px; /* Softer corners */
  display: flex;
  align-items: center;
  gap: 18px; /* More space */
  font-size: 1.05em;

  svg {
    font-size: 2em; /* Larger alert icon */
    color: #e74c3c; /* Stronger red for icon */
  }

  strong {
    font-weight: 700;
    color: #a52a2a; /* Even darker red for strong text */
  }

  small {
    color: #888;
    font-size: 0.85em;
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

export const NoDataMessage = styled.p`
  text-align: center;
  color: #777;
  font-size: 1.1em;
  padding: 20px;
  background-color: #f0f0f0;
  border-radius: 8px;
`;