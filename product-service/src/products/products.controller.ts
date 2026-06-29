import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductsService } from './products.service';
import { CreateProductSchema, CreateProductDto } from './dto/create-product.dto';
import { UpdateProductSchema, UpdateProductDto } from './dto/update-product.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @MessagePattern('get_product')
  handleGetProduct(@Payload() data: { id: string }) {
    return this.productsService.findOne(data.id);
  }

  @MessagePattern('get_products_by_ids')
  handleGetProductsByIds(@Payload() data: { ids: string[] }) {
    return Promise.all(data.ids.map((id) => this.productsService.findOne(id)));
  }

  @MessagePattern('deduct_stock')
  handleDeductStock(@Payload() data: { id: string; quantity: number }) {
    return this.productsService.deductStock(data.id, data.quantity);
  }

  @MessagePattern('restore_stock')
  handleRestoreStock(@Payload() data: { id: string; quantity: number }) {
    return this.productsService.restoreStock(data.id, data.quantity);
  }
}
