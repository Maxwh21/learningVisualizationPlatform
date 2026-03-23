import { Request, Response } from 'express';
import { getNodeChatReply, ChatMessage, ChatReply } from '../services/nodeChatService';

export async function nodeChat(req: Request, res: Response): Promise<void> {
  try {
    const nodeId = parseInt(req.params.nodeId, 10);
    if (isNaN(nodeId)) {
      res.status(400).json({ error: 'Invalid node ID' });
      return;
    }

    const { message, history = [] } = req.body as {
      message?: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const chatReply: ChatReply = await getNodeChatReply(nodeId, message.trim(), history);
    res.json(chatReply);
  } catch (error) {
    console.error('[nodeChat]', error);
    res.status(500).json({ error: 'Failed to get chat response' });
  }
}
