# Ops Control App

A React + Vite frontend paired with an Express API for an equipment operations dashboard. The app includes:

- website dashboard for desktop
- phone/mobile operations flow
- role-based login flows
- backend API for auth and dashboard data, with optional PostgreSQL persistence

## Tech stack

- React 19
- Vite 8
- Tailwind CSS v4
- Express 4
- Node.js
- PostgreSQL (optional for local development; required for persistent deployment data)

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app in development mode:
   ```bash
   npm run dev
   ```
3. Open the frontend at the Vite URL shown in the terminal, usually:
   ```bash
   http://localhost:8443
   ```
4. The Express API runs on:
   ```bash
   http://localhost:4000
   ```

## Production build

```bash
npm run build
npm start
```

When the app is built, the Express server serves the generated Vite files from the `dist/` folder and keeps the `/api/*` routes available.

## Docker deployment

This project now includes a Dockerfile so you can push it to GitHub and deploy on Render as a Docker Web Service.

### Build locally

```bash
docker build -t ops-control-app .
docker run --rm -p 10000:10000 ops-control-app
```

Then open:

```bash
http://localhost:10000
```

### Verify the health endpoint

```bash
curl http://localhost:10000/api/health
```

## Render deployment

Use Render with a Docker-based web service.

### Render settings

- Type: Web Service
- Runtime: Docker
- Dockerfile path: `./Dockerfile`
- Docker context: `.`
- Port: `10000`
- Health check path: `/api/health`

### Why this setup works on Render

- The app builds inside Docker with Node 22.
- The Express server serves the built frontend and API on the same port.
- Render can pull the repo from GitHub and deploy the container automatically.

## Environment variables

Create a `.env` file locally if needed:

```bash
PORT=10000
NODE_ENV=production
```

Set `DATABASE_URL` to your PostgreSQL connection URL through the environment or a local `.env` file. Do not commit credentials.

Render injects the port automatically in some cases, but this app is configured to run on port `10000` for Docker compatibility.

### PostgreSQL setup

The repository does not include a running database. Create a PostgreSQL database in Render, then set the web service's `DATABASE_URL` environment variable to that database's **internal** connection URL. Locally, use a PostgreSQL URL you control. Do not commit the URL or credentials.

On startup, the API creates its tables and inserts the demo dashboard records if those tables are empty. With `DATABASE_URL` unset, the API continues to serve the in-memory demo data; the health endpoint reports `database: "not_configured"`. When configured, dashboard, equipment, alert, notification, and support-request data are read from/written to PostgreSQL.

## Project structure

```bash
src/                # React app
server/             # Express API
public/             # static assets
package.json        # app scripts and dependencies
vite.config.ts      # Vite config with API proxy for local dev
render.yaml         # Render deployment configuration
```

## Notes

- Login remains a demo flow using code `123456`; it is not production authentication.
- The initial dashboard content is sample data and is inserted only when its corresponding PostgreSQL tables are empty.
