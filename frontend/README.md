# Frontend

React SPA for IDX Exchange, bootstrapped with Create React App.

Setup, architecture, and the API this app consumes are documented in the
[project README](../README.md). Quick reference:

| Command | Does |
| --- | --- |
| `npm start` | Dev server on http://localhost:3000, proxying `/api` to :5000 |
| `npm test` | Jest + React Testing Library in watch mode |
| `npm run test:coverage` | Single run with coverage; fails below the 70% floor |
| `npm run lint` | ESLint over `src` (`lint:fix` to autofix) |
| `npm run build` | Production bundle into `build/` |

The backend must be running for the app to load data — see step 5 of the
[local setup](../README.md#local-setup).
