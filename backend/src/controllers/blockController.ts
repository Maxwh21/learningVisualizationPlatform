import { Request, Response } from 'express';
import { getBlocks, createBlock, updateBlock, deleteBlock } from '../services/blockService';
import { deleteScript } from '../services/manimService';

export function getNodeBlocks(req: Request, res: Response): void {
  const nodeId = parseInt(req.params.nodeId, 10);
  if (isNaN(nodeId)) { res.status(400).json({ error: 'Invalid node ID' }); return; }
  res.json(getBlocks(nodeId));
}

export function createNodeBlock(req: Request, res: Response): void {
  const nodeId = parseInt(req.params.nodeId, 10);
  if (isNaN(nodeId)) { res.status(400).json({ error: 'Invalid node ID' }); return; }

  const { type = 'text', content = '' } = req.body as { type?: string; content?: string };
  if (type !== 'text' && type !== 'manim') {
    res.status(400).json({ error: 'type must be text or manim' }); return;
  }

  const block = createBlock(nodeId, type, content);
  res.status(201).json(block);
}

export function updateNodeBlock(req: Request, res: Response): void {
  const blockId = parseInt(req.params.blockId, 10);
  if (isNaN(blockId)) { res.status(400).json({ error: 'Invalid block ID' }); return; }

  const { content } = req.body as { content?: string };
  if (typeof content !== 'string') {
    res.status(400).json({ error: 'content is required' }); return;
  }

  updateBlock(blockId, content);
  res.status(204).send();
}

export function deleteNodeBlock(req: Request, res: Response): void {
  const nodeId = parseInt(req.params.nodeId, 10);
  const blockId = parseInt(req.params.blockId, 10);
  if (isNaN(nodeId) || isNaN(blockId)) {
    res.status(400).json({ error: 'Invalid ID' }); return;
  }

  const block = deleteBlock(blockId);
  if (!block) { res.status(404).json({ error: 'Block not found' }); return; }

  // If it was a manim block, clean up the filesystem too
  if (block.type === 'manim') {
    deleteScript(nodeId, block.content);
  }

  res.status(204).send();
}
