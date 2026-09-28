'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RankChart } from '@/components/rank-chart';
import { TrendingUp, Plus, Info, Upload, Download } from 'lucide-react';
import { formatRank, formatChange } from '@/lib/format';
import { parseRankingCsv } from '@/lib/providers/csv-provider';
import type { Product, Keyword, RankingHistory, ProductChange } from '@/lib/types';

export default function RankingsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [rankHistory, setRankHistory] = useState<RankingHistory[]>([]);
  const [changes, setChanges] = useState<ProductChange[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedKeywordId, setSelectedKeywordId] = useState('');
  const [newRank, setNewRank] = useState('');
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const [prodRes, kwRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('keywords').select('*'),
    ]);

    const prods = (prodRes.data || []) as unknown as Product[];
    const kws = (kwRes.data || []) as unknown as Keyword[];
    setProducts(prods);
    setKeywords(kws);

    if (prods.length > 0 && !selectedProductId) {
      setSelectedProductId(prods[0].id);
    }

    if (prods.length > 0) {
      const productIds = prods.map((p) => p.id);
      const [rankRes, changesRes] = await Promise.all([
        supabase.from('ranking_history').select('*').in('product_id', productIds).order('recorded_at', { ascending: true }),
        supabase.from('product_changes').select('*').in('product_id', productIds).order('changed_at', { ascending: false }),
      ]);
      setRankHistory((rankRes.data || []) as unknown as RankingHistory[]);
      setChanges((changesRes.data || []) as unknown as ProductChange[]);
    }

    setLoading(false);
  }, [selectedProductId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const productKeywords = keywords.filter((k) => k.product_id === selectedProductId);
    if (productKeywords.length > 0) {
      setSelectedKeywordId(productKeywords[0].id);
    }
  }, [selectedProductId, keywords]);

  const productKeywords = keywords.filter((k) => k.product_id === selectedProductId);
  const chartData = rankHistory.filter((r) => r.keyword_id === selectedKeywordId);
  const chartKeyword = keywords.find((k) => k.id === selectedKeywordId);
  const chartChanges = changes.filter((c) => c.product_id === selectedProductId);

  const handleAddRank = async () => {
    if (!selectedKeywordId || !newRank) return;
    const kw = keywords.find((k) => k.id === selectedKeywordId);
    await supabase.from('ranking_history').insert({
      product_id: selectedProductId,
      keyword_id: selectedKeywordId,
      observed_rank: parseInt(newRank, 10),
      recorded_at: new Date().toISOString().split('T')[0],
    });
    setNewRank('');
    void kw;
    loadData();
  };

  const handleImportCsv = async () => {
    const rows = parseRankingCsv(csvText);
    if (rows.length === 0) {
      setImportResult('유효한 CSV 데이터가 없습니다.');
      return;
    }
    let success = 0;
    let failed = 0;
    for (const row of rows) {
      const kw = keywords.find((k) => k.keyword === row.keyword && k.product_id === row.product_id);
      const productId = row.product_id || selectedProductId;
      if (!kw || !productId) {
        failed++;
        continue;
      }
      const { error } = await supabase.from('ranking_history').insert({
        product_id: productId,
        keyword_id: kw.id,
        observed_rank: row.observed_rank,
        recorded_at: row.date,
      });
      if (error) failed++;
      else success++;
    }
    setImportResult(`${success}건 성공, ${failed}건 실패`);
    loadData();
  };

  const handleExportCsv = () => {
    const rows = rankHistory.map((r) => {
      const kw = keywords.find((k) => k.id === r.keyword_id);
      return `${r.recorded_at},${r.product_id},${kw?.keyword || ''},${r.observed_rank}`;
    });
    const csv = `date,product_id,keyword,observed_rank\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ranking_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">순위 추적</h1>
          <p className="text-sm text-gray-500 mt-1">키워드별 관찰 순위를 기록하고 추적하세요.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" /> CSV 내보내기
          </Button>
          <Button variant="outline" onClick={() => setShowImport(!showImport)}>
            <Upload className="w-4 h-4 mr-2" /> CSV 가져오기
          </Button>
        </div>
      </div>

      {showImport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CSV 가져오기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">형식: date, product_id, keyword, observed_rank</p>
            <textarea
              className="w-full min-h-[120px] rounded-md border border-gray-200 p-3 text-sm font-mono"
              placeholder="date,product_id,keyword,observed_rank&#10;2026-09-28,uuid,강아지집,18"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            {importResult && <div className="text-sm text-gray-600">{importResult}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImport(false)}>취소</Button>
              <Button className="bg-sky-500 hover:bg-sky-600" onClick={handleImportCsv}>가져오기</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs text-gray-500">상품 선택</Label>
              <select
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.product_name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-gray-500">키워드 선택</Label>
              <select
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                value={selectedKeywordId}
                onChange={(e) => setSelectedKeywordId(e.target.value)}
              >
                {productKeywords.map((k) => (
                  <option key={k.id} value={k.id}>{k.keyword}{k.is_primary ? ' (대표)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedKeywordId && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
              const kwRanks = rankHistory.filter((r) => r.keyword_id === selectedKeywordId).sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
              const current = kwRanks[kwRanks.length - 1]?.observed_rank;
              const yesterday = kwRanks[kwRanks.length - 2]?.observed_rank;
              const sevenDaysAgo = kwRanks[kwRanks.length - 8]?.observed_rank;
              const thirtyDaysAgo = kwRanks[kwRanks.length - 31]?.observed_rank;
              const best = kwRanks.length > 0 ? Math.min(...kwRanks.map((r) => r.observed_rank)) : null;
              const worst = kwRanks.length > 0 ? Math.max(...kwRanks.map((r) => r.observed_rank)) : null;
              return (
                <>
                  <Card><CardContent className="p-4">
                    <div className="text-xs text-gray-500 mb-1">현재 관찰 순위</div>
                    <div className="text-2xl font-bold text-gray-900">{formatRank(current)}</div>
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <div className="text-xs text-gray-500 mb-1">어제</div>
                    <div className="text-2xl font-bold text-gray-900">{formatRank(yesterday)}</div>
                    {current && yesterday && <div className={`text-xs ${current < yesterday ? 'text-green-600' : 'text-red-600'}`}>{formatChange(yesterday - current)}</div>}
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <div className="text-xs text-gray-500 mb-1">7일 전</div>
                    <div className="text-2xl font-bold text-gray-900">{formatRank(sevenDaysAgo)}</div>
                    {current && sevenDaysAgo && <div className={`text-xs ${current < sevenDaysAgo ? 'text-green-600' : 'text-red-600'}`}>{formatChange(sevenDaysAgo - current)}</div>}
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <div className="text-xs text-gray-500 mb-1">30일 전</div>
                    <div className="text-2xl font-bold text-gray-900">{formatRank(thirtyDaysAgo)}</div>
                    {current && thirtyDaysAgo && <div className={`text-xs ${current < thirtyDaysAgo ? 'text-green-600' : 'text-red-600'}`}>{formatChange(thirtyDaysAgo - current)}</div>}
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <div className="text-xs text-gray-500 mb-1">최고 순위</div>
                    <div className="text-2xl font-bold text-green-600">{formatRank(best)}</div>
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <div className="text-xs text-gray-500 mb-1">최저 순위</div>
                    <div className="text-2xl font-bold text-red-600">{formatRank(worst)}</div>
                  </CardContent></Card>
                </>
              );
            })()}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">관찰 순위 그래프 - {chartKeyword?.keyword}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Info className="w-3.5 h-3.5" />
                  <span>1위가 위쪽에 표시됩니다. 네이버 쇼핑 결과는 개인화, 로그인 상태, 디바이스, 시점에 따라 달라질 수 있습니다.</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RankChart data={chartData} events={chartChanges} keywordLabel={chartKeyword?.keyword} height={350} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-1 w-full">
                  <Label className="text-xs text-gray-500">관찰 순위 기록 추가</Label>
                  <Input type="number" placeholder="예: 18" value={newRank} onChange={(e) => setNewRank(e.target.value)} />
                </div>
                <Button className="bg-sky-500 hover:bg-sky-600" onClick={handleAddRank}>
                  <Plus className="w-4 h-4 mr-1" /> 기록 추가
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading && <div className="text-center text-gray-400 text-sm">불러오는 중...</div>}
    </div>
  );
}
