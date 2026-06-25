import { Router } from 'express';
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  inviteMember,
  removeMember,
  getMembers,
} from '../controllers/board.controller';
import { authenticateJWT, requireBoardMember, requireBoardRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createBoardSchema,
  updateBoardSchema,
  boardParamSchema,
  inviteMemberSchema,
} from '../schemas/board.schema';

const router = Router();

router.use(authenticateJWT);

router.post('/', validate(createBoardSchema), createBoard);
router.get('/', getBoards);
router.get('/:id', validate(boardParamSchema), requireBoardMember(), getBoardById);
router.patch('/:id', validate(updateBoardSchema), requireBoardRole(['OWNER']), updateBoard);
router.delete('/:id', validate(boardParamSchema), requireBoardRole(['OWNER']), deleteBoard);

// Collaboration routes
router.get('/:id/members', validate(boardParamSchema), requireBoardMember(), getMembers);
router.post('/:id/members', validate(inviteMemberSchema), requireBoardRole(['OWNER', 'ADMIN']), inviteMember);
router.delete('/:id/members/:userId', validate(boardParamSchema), requireBoardMember(), removeMember);

export default router;
