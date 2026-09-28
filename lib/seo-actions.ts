'use client';

import { supabase } from '@/lib/supabase-client';
import { calculateSeoScore, determineStatus, getDefaultWeights } from '@/lib/seo';
import type { Product, Competitor } from '@/lib/types';

export async function refreshSeoScore(productId: string) {
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (!product) return;

  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .eq('product_id', productId)
    .order('observed_rank', { ascending: true })
    .limit(10);

  const competitorAvg = competitors && competitors.length > 0
    ? {
        price: Math.round(competitors.reduce((s: number, c: Competitor) => s + (c.price || 0), 0) / competitors.length),
        review_count: Math.round(competitors.reduce((s: number, c: Competitor) => s + (c.review_count || 0), 0) / competitors.length),
        rating: competitors.reduce((s: number, c: Competitor) => s + (c.rating || 0), 0) / competitors.length,
      }
    : undefined;

  const scores = calculateSeoScore({ product: product as Partial<Product>, competitorAvg }, getDefaultWeights());
  const status = determineStatus(scores.total_score);

  await supabase.from('products').update({ status }).eq('id', productId);

  await supabase.from('seo_analysis').insert({
    product_id: productId,
    ...scores,
    analysis_json: {},
  });

  return { scores, status };
}

export async function getLatestSeoScore(productId: string) {
  const { data } = await supabase
    .from('seo_analysis')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
