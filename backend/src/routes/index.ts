import { Router } from 'express';
import authRoutes from './auth.routes';
import boardRoutes from './board.routes';
import taskRoutes from './task.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/boards', boardRoutes);
// Mounts /tasks and /columns on the root of API
router.use('/', taskRoutes);

export default router;
