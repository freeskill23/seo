import type { Product, ProductDataProvider } from '../types';

/**
 * 외부 API Provider - 향후 합법적이고 허용된 데이터 API가 생기면
 * 이 어댑터만 구현하면 전체 프로그램을 수정하지 않아도 됩니다.
 * 현재는 placeholder 구현.
 *
 * 이 서비스는 자동 검색, 자동 클릭, 체류시간 조작, 가짜 트래픽,
 * 매크로 방문, 리뷰 조작, CAPTCHA 우회, 로그인 자동화,
 * 프록시 회전, User-Agent 조작, 대량 크롤링 기능을 포함하지 않습니다.
 */
export class ExternalApiProvider implements ProductDataProvider {
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  async getProduct(productId: string): Promise<Partial<Product>> {
    // 향후 허용된 API 연동 시 구현
    return { naver_product_id: productId };
  }

  async searchKeyword(_keyword: string): Promise<unknown[]> {
    return [];
  }

  async getCompetitors(_keyword: string): Promise<Partial<Product>[]> {
    return [];
  }
}
