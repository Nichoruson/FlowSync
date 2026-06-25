import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID');

const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createTaskSchema = z.object({
  body: z.object({
    columnId: uuidSchema,
    boardId: uuidSchema,
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(2000).optional(),
    priority: priorityEnum.optional(),
    dueDate: z.string().datetime({ offset: true }).optional().nullable(),
    labels: z.array(z.string().max(40)).max(10).optional(),
    assignedTo: uuidSchema.optional().nullable(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({
    boardId: uuidSchema,
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    priority: priorityEnum.optional(),
    dueDate: z.string().datetime({ offset: true }).optional().nullable(),
    labels: z.array(z.string().max(40)).max(10).optional(),
    assignedTo: uuidSchema.optional().nullable(),
  }),
});

export const moveTaskSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({
    boardId: uuidSchema,
    newColumnId: uuidSchema,
    newPosition: z.number().positive(),
    currentVersion: z.number().int().positive(),
  }),
});

export const deleteTaskSchema = z.object({
  params: z.object({ id: uuidSchema }),
  query: z.object({
    boardId: uuidSchema,
  }),
});

export const createColumnSchema = z.object({
  body: z.object({
    boardId: uuidSchema,
    title: z.string().min(1, 'Title is required').max(80),
  }),
});

export const updateColumnSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({
    boardId: uuidSchema,
    title: z.string().min(1).max(80).optional(),
    newPosition: z.number().positive().optional(),
  }),
});

export const moveColumnSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({
    boardId: uuidSchema,
    newPosition: z.number().positive(),
  }),
});

export const deleteColumnSchema = z.object({
  params: z.object({ id: uuidSchema }),
  query: z.object({
    boardId: uuidSchema,
  }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>['body'];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
