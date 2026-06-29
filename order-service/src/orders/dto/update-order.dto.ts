import { z } from 'zod';
import { OrderStatus } from '../entities/order.entity';

export const UpdateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export type UpdateOrderDto = z.infer<typeof UpdateOrderSchema>;
