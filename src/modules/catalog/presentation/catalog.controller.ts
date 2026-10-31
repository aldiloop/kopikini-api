import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ResponseMessage } from '../../../common/response/response-message.decorator';
import { CatalogService } from '../application/catalog.service';
import {
  presentCatalogCategory,
  presentCategory,
  presentPriceQuote,
  presentProduct,
} from './catalog.presenter';
import { CatalogQueryDto, PriceQuoteDto } from './dto/catalog.dto';

@Controller('menu')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /** GET /api/v1/menu/catalog?store_id= — kategori & produk aktif gerai (BSD §3). */
  @Get('catalog')
  @ResponseMessage('Menu retrieved successfully')
  async getCatalog(@Query() q: CatalogQueryDto) {
    const result = await this.catalogService.getStoreCatalog(q.store_id);
    return {
      store: result.store,
      categories: result.categories.map(presentCatalogCategory),
    };
  }

  /** GET /api/v1/menu/categories — daftar kategori aktif. */
  @Get('categories')
  @ResponseMessage('Categories retrieved successfully')
  async listCategories() {
    return (await this.catalogService.listCategories()).map(presentCategory);
  }

  /** GET /api/v1/menu/products/:id — detail produk + modifier groups. */
  @Get('products/:id')
  @ResponseMessage('Product retrieved successfully')
  async getProduct(@Param('id', new ParseUUIDPipe()) id: string) {
    return presentProduct(await this.catalogService.getProduct(id));
  }

  /** POST /api/v1/menu/products/:id/price — validasi modifier & kalkulasi harga. */
  @Post('products/:id/price')
  @HttpCode(200)
  @ResponseMessage('Price calculated successfully')
  async quotePrice(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: PriceQuoteDto) {
    return presentPriceQuote(
      await this.catalogService.quotePrice(id, body.modifier_ids, body.quantity ?? 1),
    );
  }
}
