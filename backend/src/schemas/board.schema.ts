import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID');

export const createBoardSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(100),
    description: z.string().max(500).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color')
      .optional(),
  }),
});

export const updateBoardSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  }),
});

export const boardParamSchema = z.object({
  params: z.object({ id: uuidSchema }),
});

export const inviteMemberSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>['body'];
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>['body'];
