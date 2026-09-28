'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Search, Trash2, Pencil } from 'lucide-react';
import { formatPrice, formatRank, getStatusLabel, getStatusColor, getScoreColor } from '@/lib/format';
import type { Product, Keyword, RankingHistory, SeoAnalysis } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [rankHistory, setRankHistory] = useState<RankingHistory[]>([]);
  const [seoAnalyses, setSeoAnalyses] = useState<SeoAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const [productsRes, keywordsRes, seoRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('keywords').select('*'),
      supabase.from('seo_analysis').select('*').order('created_at', { ascending: false }),
    ]);

    const prods = (productsRes.data || []) as unknown as Product[];
    setProducts(prods);
    setKeywords((keywordsRes.data || []) as unknown as Keyword[]);
    setSeoAnalyses((seoRes.data || []) as unknown as SeoAnalysis[]);

    if (prods.length > 0) {
      const productIds = prods.map((p) => p.id);
      const rankRes = await supabase
        .from('ranking_history')
        .select('*')
        .in('product_id', productIds)
        .order('recorded_at', { ascending: false });
      setRankHistory((rankRes.data || []) as unknown as RankingHistory[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까? 모든 관련 데이터가 삭제됩니다.')) return;
    await supabase.from('products').delete().eq('id', id);
    loadProducts();
  };

  const latestSeoByProduct = new Map<string, SeoAnalysis>();
  for (const s of seoAnalyses) {
    if (!latestSeoByProduct.has(s.product_id)) {
      latestSeoByProduct.set(s.product_id, s);
    }
  }

  const latestRankByProduct = new Map<string, number>();
  const weekAgoRankByProduct = new Map<string, number>();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  for (const r of rankHistory) {
    if (!latestRankByProduct.has(r.product_id)) {
      latestRankByProduct.set(r.product_id, r.observed_rank);
    }
    if (new Date(r.recorded_at) <= weekAgo && !weekAgoRankByProduct.has(r.product_id)) {
      weekAgoRankByProduct.set(r.product_id, r.observed_rank);
    }
  }

  const filtered = products.filter((p) =>
    p.product_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.primary_keyword || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.naver_product_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품</h1>
          <p className="text-sm text-gray-500 mt-1">등록된 상품 목록을 관리하세요.</p>
        </div>
        <Link href="/products/new">
          <Button className="bg-sky-500 hover:bg-sky-600">
            <Plus className="w-4 h-4 mr-2" />
            상품 등록
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="상품명, 키워드, 상품ID로 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-12">데이터를 불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">등록된 상품이 없습니다.</p>
              <Link href="/products/new">
                <Button className="bg-sky-500 hover:bg-sky-600">
                  <Plus className="w-4 h-4 mr-2" />
                  첫 상품 등록
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">상품</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">상품 ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">대표 키워드</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">관찰 순위</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">SEO 자체점수</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">7일 변화</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">상태</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const seo = latestSeoByProduct.get(product.id);
                    const rank = latestRankByProduct.get(product.id);
                    const prevRank = weekAgoRankByProduct.get(product.id);
                    const change = rank && prevRank ? prevRank - rank : null;
                    const productKeywords = keywords.filter((k) => k.product_id === product.id);
                    return (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/products/${product.id}`} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {product.image_url ? (
                                <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate max-w-[200px]">{product.product_name}</div>
                              <div className="text-xs text-gray-500">{formatPrice(product.price)}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">{product.naver_product_id || '-'}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Badge variant="secondary" className="text-xs">{product.primary_keyword || '-'}</Badge>
                          {productKeywords.length > 0 && (
                            <span className="text-xs text-gray-400 ml-1">+{productKeywords.length - 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{formatRank(rank)}</td>
                        <td className="px-4 py-3 text-center">
                          {seo ? (
                            <span className={`font-bold ${getScoreColor(seo.total_score)}`}>{seo.total_score}</span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          {change !== null ? (
                            <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}>
                              {change > 0 ? '▲' : change < 0 ? '▼' : '-'} {Math.abs(change)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(product.status)}`}>
                            {getStatusLabel(product.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/products/${product.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(product.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
