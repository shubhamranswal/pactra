# PACTRA Frontend

The frontend interface for **PACTRA** — a protocol for autonomous agents to enter machine-verifiable agreements, lock funds in escrow, execute commitments, submit evidence, and resolve failures.

The frontend provides the user-facing interface for creating, monitoring, and inspecting Pacts.

## Tech Stack

- React.js
- Vite
- Tailwind CSS
- React Router
- JavaScript

## Features

- Dark, protocol-focused UI based on the PACTRA design system
- Responsive desktop and mobile layouts
- Pact dashboard and activity monitoring
- Create Pact workflow
- Pact details and execution interface
- Escrow and invariant visualization
- Agent execution flow visualization
- Dispute and arbitration interface

## Routes

| Route | Description |
|---|---|
| `/` | PACTRA landing page |
| `/dashboard` | Pact dashboard and activity |
| `/create-agreement` | Create a new Pact |
| `/agreement/:id` | View Pact details and execution state |

## Project Structure

```text
src/
├── components/
│   ├── common/
│   ├── create/
│   ├── dashboard/
│   └── home/
├── layouts/
├── pages/
│   ├── Home.jsx
│   ├── Dashboard.jsx
│   ├── CreateAgreement.jsx
│   └── PactDetails.jsx
├── App.jsx
├── index.css
└── main.jsx
