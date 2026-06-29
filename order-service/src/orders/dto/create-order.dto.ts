import { z } from 'zod';

export const OrderItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1),
});

export const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  customerName: z.string().optional(),
  customerEmail: z.email().optional(),
});

export type OrderItemDto = z.infer<typeof OrderItemSchema>;
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
