import { Router } from 'express';
import {
  listTrees,
  getTree,
  createNewTree,
  deleteTree,
} from '../controllers/treeController';

const router = Router();

router.get('/list', listTrees);
router.get('/:id', getTree);
router.post('/create', createNewTree);
router.delete('/:id', deleteTree);

export default router;
