# Cashflow Tracker

A personal finance tracker to monitor income and expenses with expected vs actual amounts.

## Features

- Track multiple income types (salary, freelance, rental)
- Track expenses by category (groceries, utilities, subscriptions)
- Expected vs Actual amount tracking
- Quick confirm entries
- Drag-and-drop between months
- Cumulative balance visualization

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python) as Vercel Serverless Functions
- **Database**: Turso (SQLite in the cloud)

## Deploy to Vercel

### 1. Create a Turso Database

1. Sign up at [turso.tech](https://turso.tech)
2. Create a new database
3. Get your database URL and auth token from the dashboard

### 2. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/cashflow)

Or manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### 3. Set Environment Variables

In your Vercel project settings, add:

- `TURSO_DATABASE_URL`: Your Turso database URL (e.g., `libsql://your-db.turso.io`)
- `TURSO_AUTH_TOKEN`: Your Turso auth token

## Local Development

### Prerequisites

- [Bun](https://bun.sh) (or Node.js/npm)
- Python 3.9+

### Setup

```bash
# Install frontend dependencies
bun install

# Install Python dependencies (for local API development)
pip install -r api/requirements.txt

# Start the frontend development server
bun run dev
```

For local development, the API uses a local SQLite file (`local.db`). For full local development with the API:

```bash
# In one terminal - run the frontend
bun run dev

# In another terminal - run the API locally
cd api && uvicorn index:app --reload --port 8000
```

## Project Structure

```
├── api/                  # FastAPI serverless functions
│   ├── index.py         # Main API endpoints
│   └── requirements.txt # Python dependencies
├── src/                  # React frontend
│   ├── components/      # UI components
│   ├── hooks/           # React Query hooks
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
├── vercel.json          # Vercel configuration
└── package.json         # Frontend dependencies
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso authentication token |
