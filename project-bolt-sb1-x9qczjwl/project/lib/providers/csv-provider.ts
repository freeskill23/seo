import type { Product, ProductDataProvider } from '../types';

export class CsvProvider implements ProductDataProvider {
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

export interface CsvRankingRow {
  date: string;
  product_id: string;
  keyword: string;
  observed_rank: number;
}

export function parseRankingCsv(text: string): CsvRankingRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: CsvRankingRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 4) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });
    rows.push({
      date: row.date || '',
      product_id: row.product_id || '',
      keyword: row.keyword || '',
      observed_rank: parseInt(row.observed_rank || '0', 10),
    });
  }
  return rows;
}

export interface CsvCompetitorRow {
  keyword: string;
  product_name: string;
  product_url: string;
  price: number;
  review_count: number;
  rating: number;
  shipping: string;
  observed_rank: number;
}

export function parseCompetitorCsv(text: string): CsvCompetitorRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: CsvCompetitorRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 8) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });
    rows.push({
      keyword: row.keyword || '',
      product_name: row.product_name || '',
      product_url: row.product_url || '',
      price: parseInt(row.price || '0', 10),
      review_count: parseInt(row.review_count || '0', 10),
      rating: parseFloat(row.rating || '0'),
      shipping: row.shipping || '',
      observed_rank: parseInt(row.observed_rank || '0', 10),
    });
  }
  return rows;
}

export function exportRankingCsv(rows: CsvRankingRow[]): string {
  const header = 'date,product_id,keyword,observed_rank';
  const body = rows
    .map((r) => `${r.date},${r.product_id},${r.keyword},${r.observed_rank}`)
    .join('\n');
  return `${header}\n${body}`;
}

export function exportCompetitorCsv(rows: CsvCompetitorRow[]): string {
  const header = 'keyword,product_name,product_url,price,review_count,rating,shipping,observed_rank';
  const body = rows
    .map(
      (r) =>
        `${r.keyword},${r.product_name},${r.product_url},${r.price},${r.review_count},${r.rating},${r.shipping},${r.observed_rank}`
    )
    .join('\n');
  return `${header}\n${body}`;
}
