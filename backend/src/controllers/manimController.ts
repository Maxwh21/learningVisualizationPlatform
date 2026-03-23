import { Request, Response } from 'express';
import { listScripts, deleteScript, runScript } from '../services/manimService';

const VALID_SCRIPT_NAME = /^[a-z0-9_]{1,60}$/;

export function listManimScripts(req: Request, res: Response): void {
  const nodeId = parseInt(req.params.nodeId, 10);
  if (isNaN(nodeId)) {
    res.status(400).json({ error: 'Invalid node ID' });
    return;
  }
  const scripts = listScripts(nodeId);
  res.json(scripts);
}

export function deleteManimScript(req: Request, res: Response): void {
  const nodeId = parseInt(req.params.nodeId, 10);
  const { scriptName } = req.params;
  if (isNaN(nodeId)) {
    res.status(400).json({ error: 'Invalid node ID' });
    return;
  }
  if (!VALID_SCRIPT_NAME.test(scriptName)) {
    res.status(400).json({ error: 'Invalid script name' });
    return;
  }
  deleteScript(nodeId, scriptName);
  res.status(204).send();
}

export async function runManimScript(req: Request, res: Response): Promise<void> {
  const nodeId = parseInt(req.params.nodeId, 10);
  const { scriptName } = req.params;
  if (isNaN(nodeId)) {
    res.status(400).json({ error: 'Invalid node ID' });
    return;
  }
  if (!VALID_SCRIPT_NAME.test(scriptName)) {
    res.status(400).json({ error: 'Invalid script name' });
    return;
  }
  try {
    const videoName = runScript(nodeId, scriptName);
    res.json({ videoName });
  } catch (err) {
    console.error('[runManimScript]', err);
    const message = err instanceof Error ? err.message : 'Render failed';
    res.status(500).json({ error: message });
  }
}
