import { Request, Response } from 'express';
import {
  createTree,
  getAllTrees,
  getTreeById,
  deleteTreeById,
} from '../services/treeService';

export async function listTrees(req: Request, res: Response): Promise<void> {
  try {
    const trees = getAllTrees();
    res.json(trees);
  } catch (error) {
    console.error('[listTrees]', error);
    res.status(500).json({ error: 'Failed to fetch trees' });
  }
}

export async function getTree(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid tree ID' });
      return;
    }

    const tree = getTreeById(id);
    if (!tree) {
      res.status(404).json({ error: 'Tree not found' });
      return;
    }

    res.json(tree);
  } catch (error) {
    console.error('[getTree]', error);
    res.status(500).json({ error: 'Failed to fetch tree' });
  }
}

export async function createNewTree(req: Request, res: Response): Promise<void> {
  try {
    const { topic } = req.body as { topic?: string };

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      res.status(400).json({ error: 'Topic is required' });
      return;
    }

    const tree = await createTree(topic.trim());
    res.status(201).json(tree);
  } catch (error) {
    console.error('[createNewTree]', error);
    res.status(500).json({ error: 'Failed to create tree' });
  }
}

export async function deleteTree(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid tree ID' });
      return;
    }

    const deleted = deleteTreeById(id);
    if (!deleted) {
      res.status(404).json({ error: 'Tree not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('[deleteTree]', error);
    res.status(500).json({ error: 'Failed to delete tree' });
  }
}
