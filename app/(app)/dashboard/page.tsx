'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { StatCard } from '@/components/stat-card';
import { RankChart } from '@/components/rank-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Tags,
  TrendingUp,
  Search,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { formatRank, getScoreColor, getStatusLabel, getStatusColor, getPriorityLabel, getPriorityColor } from '@/lib/format';
import type { Product, Keyword, RankingHistory, Task, SeoAnalysis, ProductChange } from '@/lib/types';

interface DashboardData {
  products: Product[];
  keywords: Keyword[];
  rankHistory: RankingHistory[];
  tasks: Task[];
  seoAnalyses: SeoAnalysis[];
  changes: ProductChange[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const [productsRes, keywordsRes, tasksRes, seoRes, changesRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('keywords').select('*, product:products(*)').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('user_id', session.user.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('seo_analysis').select('*').order('created_at', { ascending: false }),
      supabase.from('product_changes').select('*').order('changed_at', { ascending: false }).limit(5),
    ]);

    const products = (productsRes.data || []) as unknown as Product[];
    const keywords = (keywordsRes.data || []) as unknown as Keyword[];
    const tasks = (tasksRes.data || []) as unknown as Task[];
    const seoAnalyses = (seoRes.data || []) as unknown as SeoAnalysis[];
    const changes = (changesRes.data || []) as unknown as ProductChange[];

    const productIds = products.map((p) => p.id);
    let rankHistory: RankingHistory[] = [];
    if (productIds.length > 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const rankRes = await supabase
        .from('ranking_history')
        .select('*')
        .in('product_id', productIds)
        .gte('recorded_at', thirtyDaysAgo.toISOString().split('T')[0])
        .order('recorded_at', { ascending: true });
      rankHistory = (rankRes.data || []) as unknown as RankingHistory[];
    }

    setData({ products, keywords, rankHistory, tasks, seoAnalyses, changes });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-96 text-gray-400 text-sm">데이터를 불러오는 중...</div>;
  }

  const { products, keywords, rankHistory, tasks, seoAnalyses, changes } = data;

  const latestSeoByProduct = new Map<string, SeoAnalysis>();
  for (const s of seoAnalyses) {
    if (!latestSeoByProduct.has(s.product_id)) {
      latestSeoByProduct.set(s.product_id, s);
    }
  }

  const avgScore = products.length > 0
    ? Math.round(products.reduce((s, p) => {
        const seo = latestSeoByProduct.get(p.id);
        return s + (seo?.total_score || 0);
      }, 0) / products.length)
    : 0;

  const latestRanksByKeyword = new Map<string, number>();
  const sortedRanks = [...rankHistory].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  for (const r of sortedRanks) {
    if (!latestRanksByKeyword.has(r.keyword_id)) {
      latestRanksByKeyword.set(r.keyword_id, r.observed_rank);
    }
  }
  const avgRank = latestRanksByKeyword.size > 0
    ? (Array.from(latestRanksByKeyword.values()).reduce((s, r) => s + r, 0) / latestRanksByKeyword.size).toFixed(1)
    : '-';

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const prevWeekRanks = new Map<string, number>();
  const weekAgoRanks = rankHistory.filter((r) => new Date(r.recorded_at) <= weekAgo);
  const sortedWeekAgo = [...weekAgoRanks].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  for (const r of sortedWeekAgo) {
    if (!prevWeekRanks.has(r.keyword_id)) {
      prevWeekRanks.set(r.keyword_id, r.observed_rank);
    }
  }

  let totalChange = 0;
  let countChange = 0;
  for (const [kwId, current] of Array.from(latestRanksByKeyword.entries())) {
    const prev = prevWeekRanks.get(kwId);
    if (prev !== undefined) {
      totalChange += prev - current;
      countChange++;
    }
  }
  const avgChange = countChange > 0 ? (totalChange / countChange).toFixed(1) : '0';

  const productsNeedingImprovement = products
    .map((p) => ({ product: p, score: latestSeoByProduct.get(p.id)?.total_score || 0 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const topRankHistory = rankHistory.length > 0
    ? rankHistory.filter((r) => r.keyword_id === sortedRanks[0]?.keyword_id)
    : [];

  const primaryKeywordId = keywords.find((k) => k.is_primary)?.id || keywords[0]?.id;
  const chartData = primaryKeywordId ? rankHistory.filter((r) => r.keyword_id === primaryKeywordId) : [];
  const chartKeyword = keywords.find((k) => k.id === primaryKeywordId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">상품 SEO 현황과 관찰 순위 변화를 한눈에 확인하세요.</p>
        </div>
        <Link href="/products/new">
          <Button className="bg-sky-500 hover:bg-sky-600">
            <Package className="w-4 h-4 mr-2" />
            상품 등록
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="등록 상품" value={`${products.length}개`} icon={<Package className="w-5 h-5" />} />
        <StatCard title="추적 키워드" value={`${keywords.length}개`} icon={<Tags className="w-5 h-5" />} />
        <StatCard title="평균 관찰 순위" value={`${avgRank}위`} icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard title="전주 대비" value={avgChange} change={parseFloat(avgChange)} changeLabel="순위 변화" icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard title="SEO 평균 점수" value={`${avgScore}점`} icon={<Search className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">최근 순위 변화</CardTitle>
              {chartKeyword && (
                <Badge variant="secondary" className="text-xs">{chartKeyword.keyword}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <RankChart data={chartData} events={changes.filter((c) => chartData.some((r) => r.product_id === c.product_id))} keywordLabel={chartKeyword?.keyword} height={280} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">오늘 해야 할 일</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">할 일이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task, i) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{task.task_title}</div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border mt-1 ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">SEO 점수 낮은 상품</CardTitle>
              <Link href="/seo" className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1">
                전체보기 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {productsNeedingImprovement.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">데이터가 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {productsNeedingImprovement.map(({ product, score }) => (
                  <Link key={product.id} href={`/products/${product.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{product.product_name}</div>
                      <div className="text-xs text-gray-500">{product.primary_keyword}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
                      <span className="text-xs text-gray-400">/100</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">최근 개선 필요 상품</CardTitle>
              <Link href="/products" className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1">
                전체보기 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">등록된 상품이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {products.slice(0, 5).map((product) => {
                  const seo = latestSeoByProduct.get(product.id);
                  const rank = latestRanksByKeyword.get(keywords.find((k) => k.product_id === product.id)?.id || '');
                  return (
                    <Link key={product.id} href={`/products/${product.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{product.product_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(product.status)}`}>
                            {getStatusLabel(product.status)}
                          </span>
                          <span className="text-xs text-gray-500">관찰 순위 {formatRank(rank)}</span>
                        </div>
                      </div>
                      {seo && (
                        <div className="text-right flex-shrink-0">
                          <div className={`text-sm font-bold ${getScoreColor(seo.total_score)}`}>{seo.total_score}점</div>
                          <div className="text-[10px] text-gray-400">자체진단</div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400" />
            안내사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              본 서비스의 모든 점수는 <strong>자체 진단 점수</strong>이며 네이버 공식 점수가 아닙니다.
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <strong>관찰 순위</strong>는 사용자가 직접 기록한 데이터이며, 네이버 쇼핑 결과는 개인화, 로그인 상태, 디바이스, 시점에 따라 달라질 수 있습니다.
            </p>
            <p className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              본 서비스는 자동 검색, 자동 클릭, 체류시간 조작, 가짜 트래픽, 리뷰 조작 등 순위 조작 기능을 포함하지 않습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
