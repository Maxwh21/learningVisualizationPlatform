import { Router } from 'express';
import { nodeChat } from '../controllers/nodeController';
import { listManimScripts, deleteManimScript, runManimScript } from '../controllers/manimController';
import { getNodeBlocks, createNodeBlock, updateNodeBlock, deleteNodeBlock } from '../controllers/blockController';

const router = Router();

router.post('/:nodeId/chat', nodeChat);

router.get('/:nodeId/manim', listManimScripts);
router.delete('/:nodeId/manim/:scriptName', deleteManimScript);
router.post('/:nodeId/manim/:scriptName/run', runManimScript);

router.get('/:nodeId/blocks', getNodeBlocks);
router.post('/:nodeId/blocks', createNodeBlock);
router.patch('/:nodeId/blocks/:blockId', updateNodeBlock);
router.delete('/:nodeId/blocks/:blockId', deleteNodeBlock);

export default router;
