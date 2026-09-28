'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight, RefreshCw, Info } from 'lucide-react';
import { getScoreColor, getScoreBgColor, getStatusLabel, getStatusColor } from '@/lib/format';
import { refreshSeoScore } from '@/lib/seo-actions';
import type { Product, SeoAnalysis } from '@/lib/types';

export default function SeoPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [seoAnalyses, setSeoAnalyses] = useState<SeoAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const [prodRes, seoRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('seo_analysis').select('*').order('created_at', { ascending: false }),
    ]);

    setProducts((prodRes.data || []) as unknown as Product[]);
    setSeoAnalyses((seoRes.data || []) as unknown as SeoAnalysis[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const latestSeoByProduct = new Map<string, SeoAnalysis>();
  for (const s of seoAnalyses) {
    if (!latestSeoByProduct.has(s.product_id)) {
      latestSeoByProduct.set(s.product_id, s);
    }
  }

  const handleRefreshAll = async () => {
    for (const p of products) {
      await refreshSeoScore(p.id);
    }
    loadData();
  };

  const sortedProducts = [...products].sort((a, b) => {
    const sa = latestSeoByProduct.get(a.id)?.total_score || 0;
    const sb = latestSeoByProduct.get(b.id)?.total_score || 0;
    return sa - sb;
  });

  const avgScore = products.length > 0
    ? Math.round(products.reduce((s, p) => s + (latestSeoByProduct.get(p.id)?.total_score || 0), 0) / products.length)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO 분석</h1>
          <p className="text-sm text-gray-500 mt-1">상품별 SEO 자체진단 점수를 확인하세요.</p>
        </div>
        <Button variant="outline" onClick={handleRefreshAll} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          전체 재계산
        </Button>
      </div>

      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p>
              본 점수는 <strong>자체 진단 점수</strong>이며 네이버 공식 점수가 아닙니다.
              상품명 최적화(25점), 카테고리 적합성(15점), 브랜드/제조사(10점), 속성 완성도(15점),
              가격 경쟁력(10점), 리뷰 경쟁력(10점), 배송 경쟁력(10점), 정보 완성도(5점)로 구성됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">평균 점수</div>
          <div className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">좋음 (80+)</div>
          <div className="text-3xl font-bold text-green-600">{products.filter((p) => (latestSeoByProduct.get(p.id)?.total_score || 0) >= 80).length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">관찰 필요 (60+)</div>
          <div className="text-3xl font-bold text-blue-600">{products.filter((p) => { const s = latestSeoByProduct.get(p.id)?.total_score || 0; return s >= 60 && s < 80; }).length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">개선 필요 (&lt;60)</div>
          <div className="text-3xl font-bold text-amber-600">{products.filter((p) => (latestSeoByProduct.get(p.id)?.total_score || 0) < 60).length}</div>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
      ) : sortedProducts.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">등록된 상품이 없습니다.</p>
          <Link href="/products/new"><Button className="mt-4 bg-sky-500 hover:bg-sky-600">상품 등록</Button></Link>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedProducts.map((product) => {
            const seo = latestSeoByProduct.get(product.id);
            const score = seo?.total_score || 0;
            const scoreItems = seo ? [
              { label: '상품명', score: seo.title_score, weight: 25 },
              { label: '카테고리', score: seo.category_score, weight: 15 },
              { label: '브랜드', score: seo.brand_score, weight: 10 },
              { label: '속성', score: seo.attribute_score, weight: 15 },
              { label: '가격', score: seo.price_score, weight: 10 },
              { label: '리뷰', score: seo.review_score, weight: 10 },
              { label: '배송', score: seo.shipping_score, weight: 10 },
              { label: '완성도', score: seo.completeness_score, weight: 5 },
            ] : [];
            return (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${product.id}`}>
                          <CardTitle className="text-sm hover:text-sky-600 cursor-pointer truncate">{product.product_name}</CardTitle>
                        </Link>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(product.status)}`}>
                            {getStatusLabel(product.status)}
                          </span>
                          <Badge variant="secondary" className="text-xs">{product.primary_keyword}</Badge>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</div>
                        <div className="text-xs text-gray-400">/ 100</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scoreItems.map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-600">{item.label}</span>
                          <span className={`text-xs font-medium ${getScoreColor(item.score)}`}>{item.score}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${getScoreBgColor(item.score)}`} style={{ width: `${item.score}%` }} />
                        </div>
                      </div>
                    ))}
                    <Link href={`/products/${product.id}`} className="flex items-center justify-center gap-1 text-xs text-sky-600 hover:text-sky-700 pt-2">
                      상세 분석 보기 <ArrowRight className="w-3 h-3" />
                    </Link>
                  </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
