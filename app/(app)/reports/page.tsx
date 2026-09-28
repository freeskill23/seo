'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, TrendingUp, Loader2 } from 'lucide-react';
import { formatRank, formatChange, formatDateFull } from '@/lib/format';
import type { Product, Keyword, RankingHistory, Competitor, SeoAnalysis } from '@/lib/types';

export default function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [rankHistory, setRankHistory] = useState<RankingHistory[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [seoAnalyses, setSeoAnalyses] = useState<SeoAnalysis[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const [prodRes, kwRes, seoRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('keywords').select('*'),
      supabase.from('seo_analysis').select('*').order('created_at', { ascending: false }),
    ]);

    const prods = (prodRes.data || []) as unknown as Product[];
    setProducts(prods);
    setKeywords((kwRes.data || []) as unknown as Keyword[]);
    setSeoAnalyses((seoRes.data || []) as unknown as SeoAnalysis[]);

    if (prods.length > 0 && !selectedProductId) setSelectedProductId(prods[0].id);

    if (prods.length > 0) {
      const productIds = prods.map((p) => p.id);
      const [rankRes, compRes] = await Promise.all([
        supabase.from('ranking_history').select('*').in('product_id', productIds).order('recorded_at', { ascending: true }),
        supabase.from('competitors').select('*').in('product_id', productIds),
      ]);
      setRankHistory((rankRes.data || []) as unknown as RankingHistory[]);
      setCompetitors((compRes.data || []) as unknown as Competitor[]);
    }

    setLoading(false);
  }, [selectedProductId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const productKeywords = keywords.filter((k) => k.product_id === selectedProductId);
  const productRankHistory = rankHistory.filter((r) => r.product_id === selectedProductId);
  const productCompetitors = competitors.filter((c) => c.product_id === selectedProductId);

  const generateReport = async () => {
    if (!selectedProductId) return;
    setGenerating(true);

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekRanks = productRankHistory.filter((r) => new Date(r.recorded_at) >= weekAgo);
    const lastWeekRanks = productRankHistory.filter((r) => new Date(r.recorded_at) >= twoWeeksAgo && new Date(r.recorded_at) < weekAgo);

    const avgThisWeek = thisWeekRanks.length > 0 ? thisWeekRanks.reduce((s, r) => s + r.observed_rank, 0) / thisWeekRanks.length : 0;
    const avgLastWeek = lastWeekRanks.length > 0 ? lastWeekRanks.reduce((s, r) => s + r.observed_rank, 0) / lastWeekRanks.length : 0;

    const keywordChanges: Array<{ keyword: string; oldRank: number; newRank: number; change: number }> = [];
    for (const kw of productKeywords) {
      const kwRanks = productRankHistory.filter((r) => r.keyword_id === kw.id).sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      const thisWeek = kwRanks.filter((r) => new Date(r.recorded_at) >= weekAgo);
      const lastWeek = kwRanks.filter((r) => new Date(r.recorded_at) >= twoWeeksAgo && new Date(r.recorded_at) < weekAgo);
      if (thisWeek.length > 0 && lastWeek.length > 0) {
        const avgThis = thisWeek.reduce((s, r) => s + r.observed_rank, 0) / thisWeek.length;
        const avgLast = lastWeek.reduce((s, r) => s + r.observed_rank, 0) / lastWeek.length;
        keywordChanges.push({ keyword: kw.keyword, oldRank: Math.round(avgLast), newRank: Math.round(avgThis), change: Math.round(avgLast - avgThis) });
      }
    }

    const topRiser = keywordChanges.sort((a, b) => b.change - a.change)[0];

    const competitorChanges: Array<{ name: string; priceChange: number }> = [];
    const top10Competitors = productCompetitors.slice(0, 10);
    for (const comp of top10Competitors) {
      competitorChanges.push({ name: comp.product_name, priceChange: 0 });
    }

    const reportData = {
      product_id: selectedProductId,
      avg_this_week: avgThisWeek.toFixed(1),
      avg_last_week: avgLastWeek.toFixed(1),
      change: (avgLastWeek - avgThisWeek).toFixed(1),
      top_riser: topRiser || null,
      keyword_count: productKeywords.length,
      competitor_count: productCompetitors.length,
      generated_at: today.toISOString(),
    };

    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('reports').insert({
      product_id: selectedProductId,
      user_id: session?.user.id,
      report_type: 'weekly',
      report_json: reportData,
    });

    setGenerating(false);
    alert('주간 리포트가 생성되었습니다.');
  };

  const downloadReport = () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekRanks = productRankHistory.filter((r) => new Date(r.recorded_at) >= weekAgo);
    const lastWeekRanks = productRankHistory.filter((r) => new Date(r.recorded_at) >= twoWeeksAgo && new Date(r.recorded_at) < weekAgo);
    const avgThisWeek = thisWeekRanks.length > 0 ? (thisWeekRanks.reduce((s, r) => s + r.observed_rank, 0) / thisWeekRanks.length).toFixed(1) : '0';
    const avgLastWeek = lastWeekRanks.length > 0 ? (lastWeekRanks.reduce((s, r) => s + r.observed_rank, 0) / lastWeekRanks.length).toFixed(1) : '0';

    const product = products.find((p) => p.id === selectedProductId);
    const reportText = `주간 SEO 리포트
========================

상품: ${product?.product_name || ''}
생성일: ${formatDateFull(today.toISOString())}

평균 관찰 순위
- 지난주: ${avgLastWeek}
- 이번주: ${avgThisWeek}
- 변화: ${formatChange(parseFloat(avgLastWeek) - parseFloat(avgThisWeek))}

추적 키워드 수: ${productKeywords.length}
경쟁상품 수: ${productCompetitors.length}

키워드별 순위 변화
${productKeywords.map((kw) => {
  const kwRanks = productRankHistory.filter((r) => r.keyword_id === kw.id).sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  const current = kwRanks[kwRanks.length - 1]?.observed_rank;
  const weekAgoRank = kwRanks[kwRanks.length - 8]?.observed_rank;
  const change = current && weekAgoRank ? weekAgoRank - current : 0;
  return `- ${kw.keyword}: ${formatRank(weekAgoRank)} → ${formatRank(current)} (${formatChange(change)})`;
}).join('\n')}

주의: 본 리포트의 점수는 자체 진단 점수이며 네이버 공식 점수가 아닙니다.
관찰 순위는 사용자가 직접 기록한 데이터입니다.
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly_report_${formatDateFull(today.toISOString())}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const thisWeekRanks = productRankHistory.filter((r) => new Date(r.recorded_at) >= weekAgo);
  const lastWeekRanks = productRankHistory.filter((r) => new Date(r.recorded_at) >= twoWeeksAgo && new Date(r.recorded_at) < weekAgo);
  const avgThisWeek = thisWeekRanks.length > 0 ? (thisWeekRanks.reduce((s, r) => s + r.observed_rank, 0) / thisWeekRanks.length).toFixed(1) : '-';
  const avgLastWeek = lastWeekRanks.length > 0 ? (lastWeekRanks.reduce((s, r) => s + r.observed_rank, 0) / lastWeekRanks.length).toFixed(1) : '-';
  const rankChange = avgThisWeek !== '-' && avgLastWeek !== '-' ? (parseFloat(avgLastWeek) - parseFloat(avgThisWeek)).toFixed(1) : '-';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">리포트</h1>
          <p className="text-sm text-gray-500 mt-1">주간 SEO 리포트를 생성하고 다운로드하세요.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadReport} disabled={!selectedProductId}>
            <Download className="w-4 h-4 mr-2" /> 다운로드
          </Button>
          <Button className="bg-sky-500 hover:bg-sky-600" onClick={generateReport} disabled={!selectedProductId || generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            주간 리포트 생성
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.product_name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedProductId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">주간 SEO 리포트 미리보기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">평균 관찰 순위</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">지난주</div>
                  <div className="text-2xl font-bold text-gray-900">{avgLastWeek}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">이번주</div>
                  <div className="text-2xl font-bold text-gray-900">{avgThisWeek}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">변화</div>
                  <div className={`text-2xl font-bold ${parseFloat(rankChange) > 0 ? 'text-green-600' : parseFloat(rankChange) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {rankChange !== '-' ? formatChange(parseFloat(rankChange)) : '-'}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">키워드별 순위 변화</h3>
              <div className="space-y-2">
                {productKeywords.map((kw) => {
                  const kwRanks = productRankHistory.filter((r) => r.keyword_id === kw.id).sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                  const current = kwRanks[kwRanks.length - 1]?.observed_rank;
                  const weekAgoRank = kwRanks[kwRanks.length - 8]?.observed_rank;
                  const change = current && weekAgoRank ? weekAgoRank - current : null;
                  return (
                    <div key={kw.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        {kw.is_primary && <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 text-xs">대표</Badge>}
                        <span className="font-medium text-sm">{kw.keyword}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500">{formatRank(weekAgoRank)} → {formatRank(current)}</span>
                        {change !== null && (
                          <span className={`font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {formatChange(change)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {productKeywords.length === 0 && <p className="text-sm text-gray-400 text-center py-4">키워드가 없습니다.</p>}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">이번주 추천 작업</h3>
              <div className="space-y-2">
                {(() => {
                  const recommendations: string[] = [];
                  if (parseFloat(rankChange) < 0) recommendations.push('관찰 순위가 하락했습니다. 상품명과 키워드를 점검하세요.');
                  if (productCompetitors.length < 5) recommendations.push('경쟁상품 데이터를 추가로 등록하여 분석 정확도를 높이세요.');
                  const latestSeo = seoAnalyses.find((s) => s.product_id === selectedProductId);
                  if (latestSeo && latestSeo.total_score < 60) recommendations.push('SEO 자체진단 점수가 낮습니다. 상품 속성과 정보 완성도를 개선하세요.');
                  if (recommendations.length === 0) recommendations.push('안정적인 상태입니다. 지속적인 모니터링을 권장합니다.');
                  return recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-800">
                      <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {r}
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                본 리포트의 점수는 자체 진단 점수이며 네이버 공식 점수가 아닙니다.
                관찰 순위는 사용자가 직접 기록한 데이터이며, 네이버 쇼핑 결과는 개인화, 로그인 상태, 디바이스, 시점에 따라 달라질 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <div className="text-center text-gray-400 text-sm">불러오는 중...</div>}
    </div>
  );
}
