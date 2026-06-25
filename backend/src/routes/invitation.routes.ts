import { Router } from 'express';
import {
  createInvitation,
  getInvitation,
  respondToInvitation,
  getPendingInvitations,
  revokeInvitation,
} from '../controllers/invitation.controller';
import { authenticateJWT, requireBoardMember, requireBoardRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createInvitationSchema,
  respondToInvitationSchema,
  invitationTokenSchema,
} from '../schemas/invitation.schema';
import { boardParamSchema } from '../schemas/board.schema';

const router = Router();

// Open routes (no authentication required)
router.get('/invitations/:token', validate(invitationTokenSchema), getInvitation);

// Authenticated routes
router.post('/invitations/:token/respond', authenticateJWT, validate(respondToInvitationSchema), respondToInvitation);

// Board-specific invitation management (Requires authentication and board role check)
router.post(
  '/boards/:id/invitations',
  authenticateJWT,
  validate(createInvitationSchema),
  requireBoardRole(['OWNER', 'ADMIN']),
  createInvitation
);

router.get(
  '/boards/:id/invitations',
  authenticateJWT,
  validate(boardParamSchema),
  requireBoardMember(),
  getPendingInvitations
);

router.delete(
  '/boards/:id/invitations/:inviteId',
  authenticateJWT,
  validate(boardParamSchema),
  requireBoardRole(['OWNER', 'ADMIN']),
  revokeInvitation
);

export default router;
