import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID');

export const createInvitationSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const respondToInvitationSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
  body: z.object({
    action: z.enum(['ACCEPT', 'DECLINE']),
  }),
});

export const invitationTokenSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
});
