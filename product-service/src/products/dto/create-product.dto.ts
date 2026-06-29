import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().max(255),
  description: z.string().optional(),
  price: z.number().positive().multipleOf(0.01),
  stock: z.number().int().min(0),
  category: z.string().max(100).optional(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
