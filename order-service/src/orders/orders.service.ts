import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @Inject('PRODUCT_SERVICE')
    private readonly productClient: ClientProxy,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    const productIds = dto.items.map((i) => i.productId);
    const products: any[] = await firstValueFrom(
      this.productClient.send('get_products_by_ids', { ids: productIds }),
    );

    const deducted: { id: string; quantity: number }[] = [];
    for (const item of dto.items) {
      try {
        await firstValueFrom(
          this.productClient.send('deduct_stock', {
            id: item.productId,
            quantity: item.quantity,
          }),
        );
        deducted.push({ id: item.productId, quantity: item.quantity });
      } catch (err) {
        for (const d of deducted) {
          await firstValueFrom(
            this.productClient.send('restore_stock', { id: d.id, quantity: d.quantity }),
          ).catch(() => {});
        }
        throw err;
      }
    }

    const orderItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const unitPrice = Number(product.price);
      return this.orderItemRepository.create({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
      });
    });

    const totalAmount = orderItems.reduce((sum, i) => sum + Number(i.subtotal), 0);

    const order = this.orderRepository.create({
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      totalAmount,
      items: orderItems,
    });

    return this.orderRepository.save(order);
  }

  async findAll(): Promise<any[]> {
    const orders = await this.orderRepository.find({
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
    return this.enrichOrders(orders);
  }

  async findOne(id: string): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    const [enriched] = await this.enrichOrders([order]);
    return enriched;
  }

  private async enrichOrders(orders: Order[]): Promise<any[]> {
    const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId)))];
    if (productIds.length === 0) return orders;

    const products: any[] = await firstValueFrom(
      this.productClient.send('get_products_by_ids', { ids: productIds }),
    );
    const productMap = new Map(products.map((p) => [p.id, p]));

    return orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: productMap.get(item.productId) ?? null,
      })),
    }));
  }

  async update(id: string, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    order.status = dto.status;
    return this.orderRepository.save(order);
  }

  async remove(id: string): Promise<{ message: string }> {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
    return { message: `Order ${id} deleted` };
  }
}
