import { Router } from 'express';
import {
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  createColumn,
  moveColumn,
  deleteColumn,
} from '../controllers/task.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT);

// Tasks
router.post('/tasks', createTask);
router.put('/tasks/:id', updateTask);
router.put('/tasks/:id/move', moveTask);
router.delete('/tasks/:id', deleteTask);

// Columns
router.post('/columns', createColumn);
router.put('/columns/:id/move', moveColumn);
router.delete('/columns/:id', deleteColumn);

export default router;
