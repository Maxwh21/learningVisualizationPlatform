import { Router } from 'express';
import { nodeChat } from '../controllers/nodeController';

const router = Router();

router.post('/:nodeId/chat', nodeChat);

export default router;
