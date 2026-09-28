export interface Product {
  id: string;
  user_id: string;
  naver_product_id: string | null;
  product_name: string;
  product_url: string | null;
  primary_keyword: string | null;
  category: string | null;
  price: number | null;
  brand: string | null;
  manufacturer: string | null;
  review_count: number;
  rating: number;
  shipping: string | null;
  image_url: string | null;
  attributes: Record<string, string>;
  status: 'good' | 'observe' | 'improve' | 'critical';
  created_at: string;
  updated_at: string;
}

export interface Keyword {
  id: string;
  product_id: string;
  keyword: string;
  search_volume: number;
  competition: number;
  ad_competition: number;
  is_primary: boolean;
  created_at: string;
}

export interface RankingHistory {
  id: string;
  product_id: string;
  keyword_id: string;
  observed_rank: number;
  recorded_at: string;
}

export interface Competitor {
  id: string;
  keyword_id: string;
  product_id: string;
  product_name: string;
  product_url: string | null;
  price: number | null;
  review_count: number;
  rating: number;
  shipping: string | null;
  seller: string | null;
  brand: string | null;
  observed_rank: number | null;
  snapshot_date: string;
}

export interface SeoAnalysis {
  id: string;
  product_id: string;
  title_score: number;
  category_score: number;
  brand_score: number;
  attribute_score: number;
  price_score: number;
  review_score: number;
  shipping_score: number;
  completeness_score: number;
  total_score: number;
  analysis_json: Record<string, unknown>;
  created_at: string;
}

export interface ProductChange {
  id: string;
  product_id: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  memo: string | null;
  changed_at: string;
}

export interface Task {
  id: string;
  product_id: string | null;
  user_id: string;
  task_title: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'done';
  created_at: string;
}

export interface Report {
  id: string;
  product_id: string | null;
  user_id: string;
  report_type: string;
  report_json: Record<string, unknown>;
  created_at: string;
}

export interface KeywordOpportunity {
  id: string;
  keyword_id: string;
  search_volume: number;
  competition_count: number;
  ad_competition: number;
  my_rank: number | null;
  opportunity_score: number;
  updated_at: string;
}

export interface ScoreWeights {
  title: number;
  category: number;
  brand: number;
  attribute: number;
  price: number;
  review: number;
  shipping: number;
  completeness: number;
}

export interface OpportunityWeights {
  search_demand: number;
  competition: number;
  exposure: number;
}

export interface Settings {
  id: string;
  user_id: string;
  weights: ScoreWeights;
  opportunity_weights: OpportunityWeights;
  created_at: string;
}

export interface ProductDataProvider {
  getProduct(productId: string): Promise<Partial<Product>>;
  searchKeyword(keyword: string): Promise<unknown[]>;
  getCompetitors(keyword: string): Promise<Partial<Product>[]>;
}

export interface KeywordWithDetails extends Keyword {
  product_name?: string;
  current_rank?: number | null;
  previous_rank?: number | null;
  best_rank?: number | null;
  worst_rank?: number | null;
  change_7d?: number | null;
  change_30d?: number | null;
  opportunity_score?: number;
}

export interface ProductWithDetails extends Product {
  current_rank?: number | null;
  rank_change_7d?: number | null;
  total_score?: number;
  keyword_count?: number;
}
