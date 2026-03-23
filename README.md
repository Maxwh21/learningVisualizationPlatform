# Visual Learning

An AI-powered interactive learning platform that generates structured learning trees for any topic, with paced AI tutoring, mathematical animations, and note-taking.

## Project Structure

```
visualLearning/
├── backend/          Node.js + Express + SQLite + OpenAI
├── frontend/         Next.js 14 + TypeScript + Tailwind CSS
├── database/         SQLite database (auto-created)
├── manim/            Generated Manim scripts & rendered videos
└── manim_env/        Python virtual environment for Manim
```

## Features

- **Learning Tree Generation** — Type any topic and GPT-4o generates a hierarchical concept breakdown
- **Paced AI Tutoring** — Context-aware tutor that teaches one section at a time, responding to signals like "go deeper", "simpler", or "show example"
- **Manim Animations** — Request animated math visualizations from the tutor; scripts are generated, saved, and rendered in-app
- **Content Blocks** — Per-node notes and script management with persistent ordering
- **LaTeX Rendering** — Math expressions via KaTeX (`$...$` and `$$...$$`)
- **Tree Navigation** — Drill-down card view and focused study view with breadcrumbs

---

## Prerequisites

- Node.js 18+
- Python 3.9+ (for Manim animations)
- An OpenAI API key

---

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Add your OPENAI_API_KEY to .env
npm install
npm run dev
```

Backend runs on **http://localhost:3001**

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001 (default)
npm install
npm run dev
```

Frontend runs on **http://localhost:3000**

### 3. Manim (optional, for animations)

```bash
# From the project root
python3 -m venv manim_env
manim_env/bin/pip install manim
```

The backend will use this virtual environment to render animation scripts.

### 4. Database

Automatically initialized at `database/learning.db` on first backend start. No manual setup required.

---

## Environment Variables

**Backend** (`.env`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `PORT` | No | `3001` | Server port |
| `DB_PATH` | No | `database/learning.db` | SQLite path |

**Frontend** (`.env.local`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | Backend URL |

---

## API Endpoints

### Trees

| Method | Path | Description |
|---|---|---|
| `GET` | `/tree/list` | List all trees |
| `GET` | `/tree/:id` | Get tree with all nodes |
| `POST` | `/tree/create` | Generate a new tree (`{topic}`) |
| `DELETE` | `/tree/:id` | Delete tree and all associated data |

### Node Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/node/:nodeId/chat` | Send message to AI tutor (`{message, history}`) |

### Content Blocks

| Method | Path | Description |
|---|---|---|
| `GET` | `/node/:nodeId/blocks` | List blocks for a node |
| `POST` | `/node/:nodeId/blocks` | Create a block |
| `PATCH` | `/node/:nodeId/blocks/:blockId` | Update block content |
| `DELETE` | `/node/:nodeId/blocks/:blockId` | Delete a block |

### Manim

| Method | Path | Description |
|---|---|---|
| `GET` | `/node/:nodeId/manim` | List scripts for a node |
| `POST` | `/node/:nodeId/manim/:scriptName/run` | Render a script |
| `DELETE` | `/node/:nodeId/manim/:scriptName` | Delete a script |
| `GET` | `/manim/*` | Serve rendered video files |

---

## Manim Chat Commands

In the AI tutor chat, prefix messages to trigger special Manim actions:

| Prefix | Example | Effect |
|---|---|---|
| *(none)* | `explain eigenvectors` | Normal tutoring |
| `@MANIM:` | `@MANIM: animate a matrix transformation` | Generate & save a new animation script |
| `@MANIM @FIX:name` | `@MANIM @FIX:matrix_anim make it slower` | Edit an existing script |
| `@MANIM @DISCUSS:name` | `@MANIM @DISCUSS:matrix_anim what does this line do?` | Discuss a script with the tutor |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Math rendering | KaTeX (remark-math + rehype-katex) |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (better-sqlite3, WAL mode) |
| AI | OpenAI GPT-4o |
| Animations | Manim Community Edition (Python) |
