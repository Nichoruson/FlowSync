import { Router } from 'express';
import {
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  uploadAttachment,
  upload,
  createColumn,
  updateColumn,
  moveColumn,
  deleteColumn,
} from '../controllers/task.controller';
import { authenticateJWT, requireBoardMember } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  deleteTaskSchema,
  createColumnSchema,
  updateColumnSchema,
  moveColumnSchema,
  deleteColumnSchema,
} from '../schemas/task.schema';

const router = Router();

router.use(authenticateJWT);

// Tasks
router.post('/tasks', validate(createTaskSchema), requireBoardMember(), createTask);
router.put('/tasks/:id', validate(updateTaskSchema), requireBoardMember(), updateTask);
router.put('/tasks/:id/move', validate(moveTaskSchema), requireBoardMember(), moveTask);
router.delete('/tasks/:id', validate(deleteTaskSchema), requireBoardMember(), deleteTask);

// File attachment upload (multipart/form-data — skip JSON schema validation)
router.post('/tasks/:id/upload', requireBoardMember(), upload.single('file'), uploadAttachment);

// Columns
router.post('/columns', validate(createColumnSchema), requireBoardMember(), createColumn);
router.patch('/columns/:id', validate(updateColumnSchema), requireBoardMember(), updateColumn);
router.put('/columns/:id/move', validate(moveColumnSchema), requireBoardMember(), moveColumn);
router.delete('/columns/:id', validate(deleteColumnSchema), requireBoardMember(), deleteColumn);

export default router;
