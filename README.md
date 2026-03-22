# Visual Learning — Learning Trees MVP

Generate and browse AI-powered visual learning trees for any topic.

## Project Structure

```
/frontend    Next.js + TypeScript + React Flow
/backend     Node.js + Express + SQLite + OpenAI
/database    SQLite schema
```

## Prerequisites

- Node.js 18+
- An OpenAI API key

---

## Setup

### 1. Database

The SQLite database is created automatically when the backend starts. The `database/` directory will contain `learning.db`.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm install
npm run dev
```

Backend runs on **http://localhost:3001**

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## API Endpoints

| Method | Path           | Description                    |
|--------|----------------|--------------------------------|
| GET    | /tree/list     | List all trees                 |
| GET    | /tree/:id      | Get tree with all nodes        |
| POST   | /tree/create   | Generate a new tree via OpenAI |
| DELETE | /tree/:id      | Delete a tree and its nodes    |

## Features

- Create learning trees by typing any topic
- AI generates a structured, hierarchical topic breakdown
- Visual tree rendering with React Flow
- Delete trees from the detail view
