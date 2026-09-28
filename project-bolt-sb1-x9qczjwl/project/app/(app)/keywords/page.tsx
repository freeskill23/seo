'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tags, Plus, Search, TrendingUp, Loader2, Info } from 'lucide-react';
import { calculateOpportunityScore } from '@/lib/seo';
import { formatRank, getScoreColor } from '@/lib/format';
import type { Keyword, Product, KeywordOpportunity, RankingHistory } from '@/lib/types';

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Array<Keyword & { product?: Product; opportunity?: KeywordOpportunity; current_rank?: number }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newVolume, setNewVolume] = useState('');
  const [newCompetition, setNewCompetition] = useState('');

  const loadKeywords = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const [kwRes, prodRes, oppRes] = await Promise.all([
      supabase.from('keywords').select('*, product:products(*)'),
      supabase.from('products').select('*').eq('user_id', session.user.id),
      supabase.from('keyword_opportunities').select('*, keyword:keywords(*)'),
    ]);

    const oppMap = new Map<string, KeywordOpportunity>();
    for (const o of (oppRes.data || []) as unknown as KeywordOpportunity[]) {
      oppMap.set(o.keyword_id, o);
    }

    const keywordList = (kwRes.data || []) as unknown as Array<Keyword & { product?: Product }>;
    const productIds = keywordList.map((k) => k.product_id);

    let rankMap = new Map<string, number>();
    if (productIds.length > 0) {
      const rankRes = await supabase
        .from('ranking_history')
        .select('*')
        .in('product_id', productIds)
        .order('recorded_at', { ascending: false });
      for (const r of (rankRes.data || []) as unknown as RankingHistory[]) {
        if (!rankMap.has(r.keyword_id)) {
          rankMap.set(r.keyword_id, r.observed_rank);
        }
      }
    }

    const enriched = keywordList.map((kw) => ({
      ...kw,
      opportunity: oppMap.get(kw.id),
      current_rank: rankMap.get(kw.id),
    }));

    setKeywords(enriched);
    setProducts((prodRes.data || []) as unknown as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  const handleAddKeyword = async () => {
    if (!selectedProductId || !newKeyword.trim()) return;
    const { data: kwData } = await supabase.from('keywords').insert({
      product_id: selectedProductId,
      keyword: newKeyword.trim(),
      is_primary: false,
      search_volume: parseInt(newVolume || '0', 10),
      competition: parseInt(newCompetition || '0', 10),
    }).select().single();

    if (kwData) {
      const score = calculateOpportunityScore({
        search_volume: parseInt(newVolume || '0', 10),
        competition_count: parseInt(newCompetition || '0', 10),
        my_rank: null,
      });
      await supabase.from('keyword_opportunities').insert({
        keyword_id: kwData.id,
        search_volume: parseInt(newVolume || '0', 10),
        competition_count: parseInt(newCompetition || '0', 10),
        ad_competition: 0,
        my_rank: null,
        opportunity_score: score,
      });
    }

    setShowAddForm(false);
    setNewKeyword('');
    setNewVolume('');
    setNewCompetition('');
    loadKeywords();
  };

  const filtered = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(search.toLowerCase()) ||
    (k.product?.product_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">키워드</h1>
          <p className="text-sm text-gray-500 mt-1">상품별 추적 키워드와 기회 점수를 관리하세요.</p>
        </div>
        <Button className="bg-sky-500 hover:bg-sky-600" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-2" />
          키워드 추가
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">상품</Label>
                <select
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">상품 선택</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.product_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">키워드</Label>
                <Input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="예: 원목 강아지집" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">월간 검색량</Label>
                <Input type="number" value={newVolume} onChange={(e) => setNewVolume(e.target.value)} placeholder="예: 3200" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">경쟁상품수</Label>
                <Input type="number" value={newCompetition} onChange={(e) => setNewCompetition(e.target.value)} placeholder="예: 1840" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>취소</Button>
              <Button className="bg-sky-500 hover:bg-sky-600" onClick={handleAddKeyword}>추가</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="키워드 또는 상품명으로 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Tags className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">키워드가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">키워드</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 hidden md:table-cell">상품</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600 hidden md:table-cell">검색량</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600 hidden lg:table-cell">경쟁수</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">관찰 순위</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">기회 점수</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((kw) => (
                    <tr key={kw.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {kw.is_primary && <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 text-xs">대표</Badge>}
                          <span className="font-medium text-gray-900">{kw.keyword}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 hidden md:table-cell text-gray-500 truncate max-w-[150px]">{kw.product?.product_name || '-'}</td>
                      <td className="py-2 px-3 text-right hidden md:table-cell">{kw.opportunity?.search_volume?.toLocaleString() || kw.search_volume?.toLocaleString() || '-'}</td>
                      <td className="py-2 px-3 text-right hidden lg:table-cell">{kw.opportunity?.competition_count?.toLocaleString() || '-'}</td>
                      <td className="py-2 px-3 text-center font-medium">{formatRank(kw.current_rank)}</td>
                      <td className="py-2 px-3 text-center">
                        {kw.opportunity?.opportunity_score !== undefined ? (
                          <span className={`font-bold ${getScoreColor(kw.opportunity.opportunity_score)}`}>{kw.opportunity.opportunity_score}</span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">키워드 기회 점수란?</p>
              <p className="text-xs">검색 수요(40%) + 경쟁도(30%) + 현재 노출 가능성(30%)을 기반으로 한 자체 산출 점수입니다.
              점수가 높을수록 해당 키워드에서의 노출 기회가 크다는 것을 의미합니다. 참고 지표입니다.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
