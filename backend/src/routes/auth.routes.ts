import { Router } from 'express';
import { register, login, refresh, logout, getMe, updateProfile } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/auth.schema';
import { authLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticateJWT, getMe);
router.put('/profile', authenticateJWT, validate(updateProfileSchema), updateProfile);

export default router;
