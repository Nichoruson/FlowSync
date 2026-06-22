import { Router } from 'express';
import { createBoard, getBoards, getBoardById, inviteMember, removeMember, getMembers } from '../controllers/board.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.post('/', createBoard);
router.get('/', getBoards);
router.get('/:id', getBoardById);

// Collaboration routes
router.get('/:id/members', getMembers);
router.post('/:id/members', inviteMember);
router.delete('/:id/members/:userId', removeMember);

export default router;
