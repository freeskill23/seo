import type { Product, ProductDataProvider } from '../types';

export class ManualProvider implements ProductDataProvider {
  async getProduct(productId: string): Promise<Partial<Product>> {
    return { naver_product_id: productId };
  }

  async searchKeyword(_keyword: string): Promise<unknown[]> {
    return [];
  }

  async getCompetitors(_keyword: string): Promise<Partial<Product>[]> {
    return [];
  }
}
