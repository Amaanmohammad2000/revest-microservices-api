import { z } from 'zod';
import { CreateProductSchema } from './create-product.dto';

export const UpdateProductSchema = CreateProductSchema.partial();

export const UpdateStockSchema = z
  .object({
    quantity: z.number().int().min(0).optional(),
    delta: z.number().int().optional(),
  })
  .refine((data) => data.quantity !== undefined || data.delta !== undefined, {
    message: 'Either quantity or delta must be provided',
  });

export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type UpdateStockDto = z.infer<typeof UpdateStockSchema>;
