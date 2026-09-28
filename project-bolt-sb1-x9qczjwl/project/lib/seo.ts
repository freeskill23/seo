import type { Product, ScoreWeights } from './types';

const DEFAULT_WEIGHTS: ScoreWeights = {
  title: 25,
  category: 15,
  brand: 10,
  attribute: 15,
  price: 10,
  review: 10,
  shipping: 10,
  completeness: 5,
};

export function getDefaultWeights(): ScoreWeights {
  return { ...DEFAULT_WEIGHTS };
}

interface ScoreInput {
  product: Partial<Product>;
  competitorAvg?: {
    price?: number;
    review_count?: number;
    rating?: number;
  };
}

function scoreTitle(product: Partial<Product>): number {
  const name = product.product_name || '';
  if (!name) return 0;
  let score = 50;
  const words = name.trim().split(/\s+/);
  if (words.length >= 3 && words.length <= 12) score += 20;
  else if (words.length > 12) score -= 10;
  if (product.primary_keyword && name.includes(product.primary_keyword)) score += 20;
  const lowerName = name.toLowerCase();
  const duplicates = words.filter((w, i) => words.indexOf(w) !== i);
  if (duplicates.length > 0) score -= 10;
  if (/[!@#$%^*]/.test(name)) score -= 10;
  void lowerName;
  return Math.max(0, Math.min(100, score));
}

function scoreCategory(product: Partial<Product>): number {
  if (!product.category) return 20;
  let score = 70;
  if (product.category.length > 2) score += 20;
  if (product.primary_keyword && product.category.includes(product.primary_keyword)) score += 10;
  return Math.max(0, Math.min(100, score));
}

function scoreBrand(product: Partial<Product>): number {
  if (!product.brand) return 30;
  let score = 70;
  if (product.manufacturer) score += 20;
  if (product.brand.length > 0) score += 10;
  return Math.max(0, Math.min(100, score));
}

function scoreAttribute(product: Partial<Product>): number {
  const attrs = product.attributes || {};
  const keys = Object.keys(attrs);
  if (keys.length === 0) return 20;
  if (keys.length >= 8) return 100;
  if (keys.length >= 5) return 80;
  if (keys.length >= 3) return 60;
  return 40;
}

function scorePrice(product: Partial<Product>, competitorAvg?: { price?: number }): number {
  if (!product.price) return 40;
  if (!competitorAvg?.price) return 60;
  const diff = (product.price - competitorAvg.price) / competitorAvg.price;
  if (diff <= -0.1) return 100;
  if (diff <= 0) return 90;
  if (diff <= 0.05) return 75;
  if (diff <= 0.1) return 60;
  if (diff <= 0.2) return 40;
  return 20;
}

function scoreReview(product: Partial<Product>, competitorAvg?: { review_count?: number }): number {
  const myReviews = product.review_count || 0;
  if (!competitorAvg?.review_count) {
    if (myReviews >= 100) return 100;
    if (myReviews >= 50) return 80;
    if (myReviews >= 20) return 60;
    if (myReviews >= 5) return 40;
    return 20;
  }
  const ratio = myReviews / competitorAvg.review_count;
  if (ratio >= 1) return 100;
  if (ratio >= 0.7) return 80;
  if (ratio >= 0.4) return 60;
  if (ratio >= 0.2) return 40;
  return 20;
}

function scoreShipping(product: Partial<Product>): number {
  const shipping = product.shipping || '';
  if (/무료/.test(shipping)) return 100;
  if (shipping && shipping.length > 0) return 60;
  return 30;
}

function scoreCompleteness(product: Partial<Product>): number {
  const fields = [
    product.product_name,
    product.category,
    product.brand,
    product.manufacturer,
    product.price,
    product.shipping,
    product.product_url,
    product.image_url,
  ];
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== '' && f !== 0).length;
  return Math.round((filled / fields.length) * 100);
}

export interface SeoScoreResult {
  title_score: number;
  category_score: number;
  brand_score: number;
  attribute_score: number;
  price_score: number;
  review_score: number;
  shipping_score: number;
  completeness_score: number;
  total_score: number;
}

export function calculateSeoScore(input: ScoreInput, weights: ScoreWeights = DEFAULT_WEIGHTS): SeoScoreResult {
  const title_score = scoreTitle(input.product);
  const category_score = scoreCategory(input.product);
  const brand_score = scoreBrand(input.product);
  const attribute_score = scoreAttribute(input.product);
  const price_score = scorePrice(input.product, input.competitorAvg);
  const review_score = scoreReview(input.product, input.competitorAvg);
  const shipping_score = scoreShipping(input.product);
  const completeness_score = scoreCompleteness(input.product);

  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0) || 100;
  const total = Math.round(
    (title_score * weights.title +
      category_score * weights.category +
      brand_score * weights.brand +
      attribute_score * weights.attribute +
      price_score * weights.price +
      review_score * weights.review +
      shipping_score * weights.shipping +
      completeness_score * weights.completeness) / weightSum
  );

  return {
    title_score,
    category_score,
    brand_score,
    attribute_score,
    price_score,
    review_score,
    shipping_score,
    completeness_score,
    total_score: total,
  };
}

export function determineStatus(totalScore: number): 'good' | 'observe' | 'improve' | 'critical' {
  if (totalScore >= 80) return 'good';
  if (totalScore >= 60) return 'observe';
  if (totalScore >= 40) return 'improve';
  return 'critical';
}

export interface OpportunityScoreInput {
  search_volume: number;
  competition_count: number;
  my_rank: number | null;
}

export function calculateOpportunityScore(
  input: OpportunityScoreInput,
  weights = { search_demand: 40, competition: 30, exposure: 30 }
): number {
  const demandScore = Math.min(100, (input.search_volume / 5000) * 100);
  const competitionScore = Math.max(0, 100 - Math.min(100, (input.competition_count / 5000) * 100));
  const exposureScore = input.my_rank
    ? Math.max(0, 100 - Math.min(100, (input.my_rank - 1) * 2))
    : 0;
  const weightSum = weights.search_demand + weights.competition + weights.exposure || 100;
  return Math.round(
    (demandScore * weights.search_demand +
      competitionScore * weights.competition +
      exposureScore * weights.exposure) / weightSum
  );
}

export interface TitleAnalysis {
  brand: string;
  primary_keyword: string;
  secondary_keywords: string[];
  attributes: string[];
  duplicate_keywords: string[];
  diagnosis: string[];
  recommended_title: string;
}

export function analyzeTitle(
  title: string,
  brand: string,
  primaryKeyword: string
): TitleAnalysis {
  const words = title.trim().split(/\s+/);
  const lowerWords = words.map((w) => w.toLowerCase());
  const duplicates = words.filter((w, i) => lowerWords.indexOf(w.toLowerCase()) !== i);
  const uniqueWords = [...new Set(words)];

  const secondary: string[] = [];
  const attrs: string[] = [];
  const knownAttrPatterns = ['중형견', '소형견', '대형견', '실내', '원목', '접이식', '경량', '프리미엄'];

  for (const word of uniqueWords) {
    if (word === brand) continue;
    if (word === primaryKeyword) continue;
    if (knownAttrPatterns.some((p) => word.includes(p))) {
      attrs.push(word);
    } else {
      secondary.push(word);
    }
  }

  const diagnosis: string[] = [];
  if (primaryKeyword && title.indexOf(primaryKeyword) > title.indexOf(brand || '') + (brand || '').length) {
    diagnosis.push('핵심 키워드 위치: 좋음');
  } else {
    diagnosis.push('핵심 키워드 위치: 브랜드 뒤 배치 권장');
  }
  diagnosis.push(`중복 키워드: ${duplicates.length}개`);
  if (words.length > 12) {
    diagnosis.push(`불필요 단어: ${words.length - 12}개 (12단어 이하 권장)`);
  }

  const recommendedParts = [brand, primaryKeyword, ...secondary.slice(0, 3), ...attrs.slice(0, 2)].filter(Boolean);
  const recommended_title = recommendedParts.join(' ');

  return {
    brand,
    primary_keyword: primaryKeyword,
    secondary_keywords: secondary,
    attributes: attrs,
    duplicate_keywords: duplicates,
    diagnosis,
    recommended_title,
  };
}
