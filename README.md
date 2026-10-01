# PACTRA Frontend

The frontend interface for **PACTRA** — a protocol for autonomous agents to enter machine-verifiable agreements, lock funds in escrow, execute commitments, submit evidence, and resolve failures.

The frontend provides the user-facing interface for creating, monitoring, and inspecting Pacts.

## Tech Stack

* React.js
* Vite
* Tailwind CSS
* React Router
* JavaScript

## Features

* Dark, protocol-focused UI based on the PACTRA design system
* Responsive desktop and mobile layouts
* Pact dashboard and activity monitoring
* Create Pact workflow
* Pact details and execution interface
* Escrow and invariant visualization
* Agent execution flow visualization
* Dispute and arbitration interface

## Routes

| Route               | Description                           |
| ------------------- | ------------------------------------- |
| `/`                 | PACTRA landing page                   |
| `/dashboard`        | Pact dashboard and activity           |
| `/create-agreement` | Create a new Pact                     |
| `/agreement/:id`    | View Pact details and execution state |

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
```

## Setup

### Prerequisites

Make sure you have the following installed:

* Node.js 18+
* npm

You can verify your installation with:

```bash
node -v
npm -v
```

### 1. Clone the repository

```bash
git clone <repository-url>
cd pactra-frontend
```

Replace `<repository-url>` with the actual GitHub repository URL.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:5173
```

### 4. Build for production

```bash
npm run build
```

The production build will be generated in:

```text
dist/
```

### 5. Preview the production build

```bash
npm run preview
```

The production build can then be previewed locally.

## Available Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite development server    |
| `npm run build`   | Create a production build            |
| `npm run preview` | Preview the production build locally |

## Environment Variables

If environment variables are required for local development, create a `.env` file in the project root:

```bash
touch .env
```

Then add the required variables:

```env
VITE_API_URL=
```

> Do not commit `.env` files containing secrets to Git.

## Development Notes

The current frontend contains the user interface and interaction flows for PACTRA.

Blockchain, escrow, validator, backend API, wallet authentication, and transaction execution can be integrated with the corresponding backend and smart-contract services.

The frontend currently supports the visualization and simulation of Pact execution states.

## Production

To create a production-ready build:

```bash
npm install
npm run build
```

The generated `dist/` directory can be deployed to platforms such as Vercel or other static hosting providers.

## License

This project is part of the PACTRA protocol.
