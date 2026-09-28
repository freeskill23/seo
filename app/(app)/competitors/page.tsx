'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CompetitivenessRadar } from '@/components/radar-chart';
import { StatCard } from '@/components/stat-card';
import { Users, Plus, Trash2, Upload, Download, GitCompare } from 'lucide-react';
import { formatPrice, formatNumber, formatRank } from '@/lib/format';
import { parseCompetitorCsv } from '@/lib/providers/csv-provider';
import type { Product, Keyword, Competitor } from '@/lib/types';

export default function CompetitorsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [newComp, setNewComp] = useState({
    keyword_id: '',
    product_name: '',
    product_url: '',
    price: '',
    review_count: '',
    rating: '',
    shipping: '무료배송',
    seller: '',
    observed_rank: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const [prodRes, kwRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('keywords').select('*'),
    ]);

    const prods = (prodRes.data || []) as unknown as Product[];
    setProducts(prods);
    setKeywords((kwRes.data || []) as unknown as Keyword[]);

    if (prods.length > 0 && !selectedProductId) {
      setSelectedProductId(prods[0].id);
    }

    if (prods.length > 0) {
      const compRes = await supabase
        .from('competitors')
        .select('*')
        .in('product_id', prods.map((p) => p.id))
        .order('observed_rank', { ascending: true });
      setCompetitors((compRes.data || []) as unknown as Competitor[]);
    }

    setLoading(false);
  }, [selectedProductId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedProductKeywords = keywords.filter((k) => k.product_id === selectedProductId);
  const selectedProductCompetitors = competitors.filter((c) => c.product_id === selectedProductId);

  const top10 = selectedProductCompetitors.slice(0, 10);
  const avgPrice = top10.length > 0 ? Math.round(top10.reduce((s, c) => s + (c.price || 0), 0) / top10.length) : 0;
  const avgReviews = top10.length > 0 ? Math.round(top10.reduce((s, c) => s + (c.review_count || 0), 0) / top10.length) : 0;
  const avgRating = top10.length > 0 ? (top10.reduce((s, c) => s + (c.rating || 0), 0) / top10.length).toFixed(1) : '0';
  const freeShippingCount = top10.filter((c) => /무료/.test(c.shipping || '')).length;

  const priceDiff = selectedProduct?.price && avgPrice ? Math.round(((selectedProduct.price - avgPrice) / avgPrice) * 100) : 0;
  const reviewDiff = selectedProduct?.review_count && avgReviews ? Math.round(((selectedProduct.review_count - avgReviews) / avgReviews) * 100) : 0;

  const radarData: Record<string, { mine: number; competitor: number }> = {
    SEO: { mine: 70, competitor: 70 },
    가격: { mine: selectedProduct?.price && avgPrice ? Math.max(0, 100 - Math.abs(priceDiff) * 2) : 50, competitor: 70 },
    리뷰: { mine: selectedProduct?.review_count && avgReviews ? Math.min(100, Math.round((selectedProduct.review_count / avgReviews) * 100)) : 30, competitor: 70 },
    평점: { mine: Math.round(((selectedProduct?.rating || 0) / 5) * 100), competitor: Math.round((parseFloat(avgRating) / 5) * 100) },
    배송: { mine: /무료/.test(selectedProduct?.shipping || '') ? 100 : 50, competitor: Math.round((freeShippingCount / 10) * 100) },
    상품정보: { mine: 70, competitor: 70 },
  };

  const handleAddCompetitor = async () => {
    if (!newComp.keyword_id || !newComp.product_name) return;
    await supabase.from('competitors').insert({
      keyword_id: newComp.keyword_id,
      product_id: selectedProductId,
      product_name: newComp.product_name,
      product_url: newComp.product_url || null,
      price: parseInt(newComp.price || '0', 10),
      review_count: parseInt(newComp.review_count || '0', 10),
      rating: parseFloat(newComp.rating || '0'),
      shipping: newComp.shipping || null,
      seller: newComp.seller || null,
      observed_rank: parseInt(newComp.observed_rank || '0', 10),
    });
    setShowAddForm(false);
    setNewComp({ keyword_id: '', product_name: '', product_url: '', price: '', review_count: '', rating: '', shipping: '무료배송', seller: '', observed_rank: '' });
    loadData();
  };

  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm('이 경쟁상품을 삭제하시겠습니까?')) return;
    await supabase.from('competitors').delete().eq('id', id);
    loadData();
  };

  const handleImportCsv = async () => {
    const rows = parseCompetitorCsv(csvText);
    if (rows.length === 0) return;
    let success = 0;
    for (const row of rows) {
      const kw = keywords.find((k) => k.keyword === row.keyword && k.product_id === selectedProductId);
      if (!kw) continue;
      const { error } = await supabase.from('competitors').insert({
        keyword_id: kw.id,
        product_id: selectedProductId,
        product_name: row.product_name,
        product_url: row.product_url,
        price: row.price,
        review_count: row.review_count,
        rating: row.rating,
        shipping: row.shipping,
        observed_rank: row.observed_rank,
      });
      if (!error) success++;
    }
    setShowImport(false);
    setCsvText('');
    loadData();
    alert(`${success}건 가져오기 완료`);
  };

  const handleExportCsv = () => {
    const rows = selectedProductCompetitors.map((c) => {
      const kw = keywords.find((k) => k.id === c.keyword_id);
      return `${kw?.keyword || ''},${c.product_name},${c.product_url || ''},${c.price || ''},${c.review_count},${c.rating},${c.shipping || ''},${c.observed_rank || ''}`;
    });
    const csv = `keyword,product_name,product_url,price,review_count,rating,shipping,observed_rank\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competitors_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCompare = (id: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const compareProducts = [selectedProduct, ...compareSelection.map((id) => top10.find((c) => c.id === id))].filter(Boolean);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">경쟁상품</h1>
          <p className="text-sm text-gray-500 mt-1">키워드별 경쟁상품을 분석하고 비교하세요.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" /> CSV 내보내기
          </Button>
          <Button variant="outline" onClick={() => setShowImport(!showImport)}>
            <Upload className="w-4 h-4 mr-2" /> CSV 가져오기
          </Button>
          <Button className="bg-sky-500 hover:bg-sky-600" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4 mr-2" /> 경쟁상품 추가
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Label className="text-xs text-gray-500">상품 선택</Label>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={selectedProductId}
            onChange={(e) => { setSelectedProductId(e.target.value); setCompareSelection([]); }}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.product_name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {showImport && (
        <Card>
          <CardHeader><CardTitle className="text-base">CSV 가져오기</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">형식: keyword, product_name, product_url, price, review_count, rating, shipping, observed_rank</p>
            <textarea
              className="w-full min-h-[120px] rounded-md border border-gray-200 p-3 text-sm font-mono"
              placeholder="keyword,product_name,product_url,price,review_count,rating,shipping,observed_rank"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImport(false)}>취소</Button>
              <Button className="bg-sky-500 hover:bg-sky-600" onClick={handleImportCsv}>가져오기</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">경쟁상품 추가</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">키워드</Label>
                <select className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" value={newComp.keyword_id} onChange={(e) => setNewComp({ ...newComp, keyword_id: e.target.value })}>
                  <option value="">선택</option>
                  {selectedProductKeywords.map((k) => <option key={k.id} value={k.id}>{k.keyword}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label className="text-xs">상품명</Label><Input value={newComp.product_name} onChange={(e) => setNewComp({ ...newComp, product_name: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">판매자</Label><Input value={newComp.seller} onChange={(e) => setNewComp({ ...newComp, seller: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">가격</Label><Input type="number" value={newComp.price} onChange={(e) => setNewComp({ ...newComp, price: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">리뷰수</Label><Input type="number" value={newComp.review_count} onChange={(e) => setNewComp({ ...newComp, review_count: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">평점</Label><Input type="number" step="0.1" max="5" value={newComp.rating} onChange={(e) => setNewComp({ ...newComp, rating: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">배송</Label><Input value={newComp.shipping} onChange={(e) => setNewComp({ ...newComp, shipping: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">관찰 순위</Label><Input type="number" value={newComp.observed_rank} onChange={(e) => setNewComp({ ...newComp, observed_rank: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">URL</Label><Input value={newComp.product_url} onChange={(e) => setNewComp({ ...newComp, product_url: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>취소</Button>
              <Button className="bg-sky-500 hover:bg-sky-600" onClick={handleAddCompetitor}>추가</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProduct && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="내 상품 가격" value={formatPrice(selectedProduct.price)} />
            <StatCard title="TOP10 평균" value={formatPrice(avgPrice)} />
            <StatCard title="가격 차이" value={`${priceDiff > 0 ? '+' : ''}${priceDiff}%`} />
            <StatCard title="배송" value={`${freeShippingCount}/10 무료`} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="내 상품 리뷰" value={formatNumber(selectedProduct.review_count)} />
            <StatCard title="TOP10 평균 리뷰" value={formatNumber(avgReviews)} />
            <StatCard title="리뷰 차이" value={`${reviewDiff > 0 ? '+' : ''}${reviewDiff}%`} />
            <StatCard title="내 평점 / TOP10" value={`${selectedProduct.rating} / ${avgRating}`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">경쟁력 레이더 분석</CardTitle></CardHeader>
              <CardContent>
                <CompetitivenessRadar data={radarData} height={350} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">상품 비교 (최대 5개)</CardTitle>
                  {compareSelection.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{compareSelection.length + 1}/5 선택됨</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {compareSelection.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">경쟁상품 표에서 비교할 상품을 선택하세요 (최대 4개).</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-medium text-gray-600">항목</th>
                          {compareProducts.map((p, i) => (
                            <th key={i} className="text-center py-2 px-2 font-medium text-gray-600 truncate max-w-[100px]">
                              {i === 0 ? '내 상품' : (p as Competitor).product_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: '가격', getVal: (p: Product | Competitor) => formatPrice('price' in p ? p.price : null) },
                          { label: '리뷰', getVal: (p: Product | Competitor) => formatNumber('review_count' in p ? p.review_count : 0) },
                          { label: '평점', getVal: (p: Product | Competitor) => (p.rating || 0).toString() },
                          { label: '배송', getVal: (p: Product | Competitor) => p.shipping || '-' },
                          { label: '관찰 순위', getVal: (p: Product | Competitor) => formatRank('observed_rank' in p ? p.observed_rank : null) },
                        ].map((row) => (
                          <tr key={row.label} className="border-b border-gray-100">
                            <td className="py-2 px-2 font-medium text-gray-600">{row.label}</td>
                            {compareProducts.map((p, i) => (
                              <td key={i} className="py-2 px-2 text-center text-gray-700">{p ? row.getVal(p) : '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">경쟁상품 목록 ({selectedProductCompetitors.length}/30)</CardTitle>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <GitCompare className="w-3.5 h-3.5" /> 비교 체크박스 선택
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="py-2 px-3 w-8"></th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">상품명</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600 hidden md:table-cell">가격</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600 hidden md:table-cell">리뷰</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600 hidden lg:table-cell">평점</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600 hidden lg:table-cell">배송</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">순위</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProductCompetitors.map((comp) => (
                      <tr key={comp.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={compareSelection.includes(comp.id)}
                            onChange={() => toggleCompare(comp.id)}
                            disabled={!compareSelection.includes(comp.id) && compareSelection.length >= 4}
                            className="w-4 h-4 accent-sky-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-medium text-gray-900 truncate max-w-[200px]">{comp.product_name}</div>
                          <div className="text-xs text-gray-500">{comp.seller}</div>
                        </td>
                        <td className="py-2 px-3 text-right hidden md:table-cell">{formatPrice(comp.price)}</td>
                        <td className="py-2 px-3 text-right hidden md:table-cell">{formatNumber(comp.review_count)}</td>
                        <td className="py-2 px-3 text-center hidden lg:table-cell">{comp.rating}</td>
                        <td className="py-2 px-3 text-center hidden lg:table-cell text-xs">{comp.shipping}</td>
                        <td className="py-2 px-3 text-center font-medium">{formatRank(comp.observed_rank)}</td>
                        <td className="py-2 px-3 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteCompetitor(comp.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {selectedProductCompetitors.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">경쟁상품이 없습니다. 추가하거나 CSV로 가져오세요.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">경쟁상품 변화 감지</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                경쟁상품의 가격, 리뷰, 순위 변화를 날짜별로 기록하여 추적합니다.
                변화 데이터는 별도 날짜에 경쟁상품 정보를 업데이트하면 자동으로 스냅샷으로 저장됩니다.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                주의: &ldquo;가격을 낮춰서 순위가 올랐다&rdquo;처럼 인과관계를 단정하지 않습니다.
                대신 &ldquo;가격 인하와 관찰 순위 상승이 같은 기간에 발생했습니다&rdquo;라고 표현합니다.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading && <div className="text-center text-gray-400 text-sm">불러오는 중...</div>}
    </div>
  );
}
