import { supabase } from './supabase-client';
import { calculateSeoScore, determineStatus } from './seo';

const DEMO_PRODUCTS: Array<Record<string, unknown>> = [
  {
    naver_product_id: 'demo-001',
    product_name: '펫홈 원목 강아지집 애견하우스 실내 강아지 집 중형견',
    product_url: 'https://example.com/product/001',
    primary_keyword: '강아지집',
    category: '반려동물/강아지/집',
    price: 119000,
    brand: '펫홈',
    manufacturer: '펫홈',
    review_count: 43,
    rating: 4.8,
    shipping: '무료배송',
    image_url: '',
    attributes: { size: '중형견', material: '원목', color: '내추럴', weight: '3.5kg' },
  },
  {
    naver_product_id: 'demo-002',
    product_name: '프리미엄 유리 텀블러 500ml 스테인리스 보온병 물병',
    product_url: 'https://example.com/product/002',
    primary_keyword: '텀블러',
    category: '주방용품/컵/텀블러',
    price: 29800,
    brand: '프리미엄',
    manufacturer: '프리미엄홈',
    review_count: 128,
    rating: 4.6,
    shipping: '무료배송',
    image_url: '',
    attributes: { capacity: '500ml', material: '스테인리스', color: '클리어', weight: '280g' },
  },
  {
    naver_product_id: 'demo-003',
    product_name: '스마트 무선 청소기 가벼운 스틱청소기 강력흡입',
    product_url: 'https://example.com/product/003',
    primary_keyword: '무선청소기',
    category: '생활가전/청소기/스틱청소기',
    price: 189000,
    brand: '스마트클린',
    manufacturer: '스마트클린전자',
    review_count: 67,
    rating: 4.3,
    shipping: '무료배송',
    image_url: '',
    attributes: { type: '스틱', power: '180W', weight: '2.5kg', battery: '40분' },
  },
];

const DEMO_KEYWORDS: Record<string, Array<{ keyword: string; is_primary: boolean; search_volume: number; competition: number }>> = {
  'demo-001': [
    { keyword: '강아지집', is_primary: true, search_volume: 12000, competition: 3200 },
    { keyword: '원목 강아지집', is_primary: false, search_volume: 3200, competition: 1840 },
    { keyword: '애견하우스', is_primary: false, search_volume: 5400, competition: 2100 },
    { keyword: '실내 강아지집', is_primary: false, search_volume: 2800, competition: 1500 },
  ],
  'demo-002': [
    { keyword: '텀블러', is_primary: true, search_volume: 45000, competition: 8900 },
    { keyword: '유리 텀블러', is_primary: false, search_volume: 8200, competition: 3200 },
    { keyword: '보온병', is_primary: false, search_volume: 22000, competition: 5600 },
    { keyword: '스테인리스 텀블러', is_primary: false, search_volume: 6700, competition: 2800 },
  ],
  'demo-003': [
    { keyword: '무선청소기', is_primary: true, search_volume: 38000, competition: 7200 },
    { keyword: '스틱청소기', is_primary: false, search_volume: 21000, competition: 4500 },
  ],
};

function generateRankHistory(keywordId: string, productId: string, startRank: number, days: number = 30) {
  const records: Array<{ product_id: string; keyword_id: string; observed_rank: number; recorded_at: string }> = [];
  const today = new Date();
  let currentRank = startRank;
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const noise = Math.floor(Math.random() * 7) - 3;
    currentRank = Math.max(1, Math.min(60, currentRank + noise));
    if (i < 15) currentRank = Math.max(1, currentRank - 1);
    if (i < 5) currentRank = Math.max(1, currentRank - 1);
    records.push({
      product_id: productId,
      keyword_id: keywordId,
      observed_rank: currentRank,
      recorded_at: date.toISOString().split('T')[0],
    });
  }
  return records;
}

function generateCompetitors(keywordId: string, productId: string, basePrice: number, baseReviews: number) {
  const competitors: Array<{
    keyword_id: string;
    product_id: string;
    product_name: string;
    product_url: string;
    price: number;
    review_count: number;
    rating: number;
    shipping: string;
    seller: string;
    brand: string;
    observed_rank: number;
    snapshot_date: string;
  }> = [];
  const today = new Date().toISOString().split('T')[0];
  const competitorNames = ['경쟁사A', '경쟁사B', '경쟁사C', '경쟁사D', '경쟁사E', '경쟁사F', '경쟁사G', '경쟁사H', '경쟁사I', '경쟁사J'];
  for (let i = 0; i < 10; i++) {
    const priceVariation = 0.7 + Math.random() * 0.4;
    competitors.push({
      keyword_id: keywordId,
      product_id: productId,
      product_name: `${competitorNames[i]} 상품 ${i + 1}`,
      product_url: `https://example.com/competitor/${i + 1}`,
      price: Math.round((basePrice * priceVariation) / 100) * 100,
      review_count: Math.round(baseReviews * (0.5 + Math.random() * 5)),
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      shipping: Math.random() > 0.2 ? '무료배송' : '3,000원',
      seller: competitorNames[i],
      brand: competitorNames[i],
      observed_rank: i + 1,
      snapshot_date: today,
    });
  }
  return competitors;
}

function generateChanges(productId: string) {
  const changes: Array<{
    product_id: string;
    change_type: string;
    old_value: string;
    new_value: string;
    memo: string;
    changed_at: string;
  }> = [];
  const today = new Date();
  const changeData = [
    { type: '가격', old: '129,000원', new: '119,000원', memo: '경쟁상품 가격 대응', daysAgo: 7 },
    { type: '상품명', old: '원목 강아지집 중형견', new: '원목 강아지집 애견하우스 실내 강아지 집 중형견', memo: '키워드 추가', daysAgo: 18 },
    { type: '대표이미지', old: '기존 이미지', new: '신규 이미지', memo: '이미지 품질 개선', daysAgo: 10 },
  ];
  for (const c of changeData) {
    const date = new Date(today);
    date.setDate(date.getDate() - c.daysAgo);
    changes.push({
      product_id: productId,
      change_type: c.type,
      old_value: c.old,
      new_value: c.new,
      memo: c.memo,
      changed_at: date.toISOString().split('T')[0],
    });
  }
  return changes;
}

export async function seedDemoData(userId: string): Promise<void> {
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id')
    .eq('user_id', userId);

  if (existingProducts && existingProducts.length > 0) return;

  for (const demoProductRaw of DEMO_PRODUCTS) {
    const demoProduct = demoProductRaw as { naver_product_id: string; product_name: string; product_url: string; primary_keyword: string; category: string; price: number; brand: string; manufacturer: string; review_count: number; rating: number; shipping: string; image_url: string; attributes: Record<string, string> };

    const { data: product, error: productErr } = await supabase
      .from('products')
      .insert({ ...demoProduct, user_id: userId })
      .select()
      .single();

    if (productErr || !product) continue;

    const competitorAvg = {
      price: Math.round((demoProduct.price * 0.85) / 100) * 100,
      review_count: Math.round(demoProduct.review_count * 3),
      rating: 4.5,
    };

    const scores = calculateSeoScore({ product: demoProduct, competitorAvg });
    const status = determineStatus(scores.total_score);

    await supabase.from('products').update({ status }).eq('id', product.id);
    await supabase.from('seo_analysis').insert({
      product_id: product.id,
      ...scores,
      analysis_json: {},
    });

    const keywords = DEMO_KEYWORDS[demoProduct.naver_product_id] || [];
    for (const kw of keywords) {
      const { data: keywordRow, error: kwErr } = await supabase
        .from('keywords')
        .insert({
          product_id: product.id,
          keyword: kw.keyword,
          is_primary: kw.is_primary,
          search_volume: kw.search_volume,
          competition: kw.competition,
        })
        .select()
        .single();

      if (kwErr || !keywordRow) continue;

      const startRank = kw.is_primary ? 25 : Math.floor(Math.random() * 30) + 15;
      const rankRecords = generateRankHistory(keywordRow.id, product.id, startRank);
      if (rankRecords.length > 0) {
        await supabase.from('ranking_history').insert(rankRecords);
      }

      const competitors = generateCompetitors(keywordRow.id, product.id, demoProduct.price, demoProduct.review_count);
      await supabase.from('competitors').insert(competitors);

      await supabase.from('keyword_opportunities').insert({
        keyword_id: keywordRow.id,
        search_volume: kw.search_volume,
        competition_count: kw.competition,
        ad_competition: Math.round(kw.competition * 0.3),
        my_rank: startRank,
        opportunity_score: Math.round(40 + Math.random() * 50),
      });
    }

    const changes = generateChanges(product.id);
    if (changes.length > 0) {
      await supabase.from('product_changes').insert(changes);
    }

    const taskData = [
      { product_id: product.id, user_id: userId, task_title: '브랜드 필드 확인', priority: 'high' },
      { product_id: product.id, user_id: userId, task_title: '미등록 상품속성 입력', priority: 'normal' },
      { product_id: product.id, user_id: userId, task_title: '상품명 중복 키워드 제거', priority: 'normal' },
    ];
    await supabase.from('tasks').insert(taskData);
  }

  await supabase.from('settings').insert({ user_id: userId });
}
