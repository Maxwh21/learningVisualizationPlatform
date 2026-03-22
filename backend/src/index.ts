import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/database';
import treeRouter from './routes/tree';
import nodeRouter from './routes/node';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/tree', treeRouter);
app.use('/node', nodeRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

initializeDatabase();

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
