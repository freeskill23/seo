'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RankChart } from '@/components/rank-chart';
import { CompetitivenessRadar } from '@/components/radar-chart';
import { StatCard } from '@/components/stat-card';
import {
  ArrowLeft,
  Package,
  TrendingUp,
  Users,
  Search,
  History,
  FileText,
  Plus,
  Trash2,
  Loader2,
  Info,
  Sparkles,
  AlertCircle,
  Lightbulb,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';
import {
  formatPrice,
  formatNumber,
  formatRank,
  formatChange,
  formatDateFull,
  getStatusLabel,
  getStatusColor,
  getScoreColor,
  getScoreBgColor,
  getPriorityLabel,
  getPriorityColor,
} from '@/lib/format';
import { calculateSeoScore, analyzeTitle, determineStatus } from '@/lib/seo';
import { refreshSeoScore } from '@/lib/seo-actions';
import type {
  Product,
  Keyword,
  RankingHistory,
  Competitor,
  SeoAnalysis,
  ProductChange,
  Task,
} from '@/lib/types';

function generateLocalAnalysis(
  product: Product | null,
  keywords: Keyword[],
  competitors: Competitor[],
  seoAnalysis: SeoAnalysis | null
): string {
  if (!product) return '상품 정보가 없습니다.';

  const top10 = competitors.slice(0, 10);
  const avgPrice = top10.length > 0 ? Math.round(top10.reduce((s, c) => s + (c.price || 0), 0) / top10.length) : 0;
  const avgReviews = top10.length > 0 ? Math.round(top10.reduce((s, c) => s + (c.review_count || 0), 0) / top10.length) : 0;
  const avgRating = top10.length > 0 ? (top10.reduce((s, c) => s + (c.rating || 0), 0) / top10.length).toFixed(1) : '0';

  const bottlenecks: string[] = [];
  const strengths: string[] = [];
  const tasks: string[] = [];

  // 리뷰 분석
  if (avgReviews > 0 && product.review_count < avgReviews * 0.5) {
    bottlenecks.push(`1. 리뷰 경쟁력 부족\n   내 상품: ${product.review_count}개 / TOP10 평균: ${avgReviews}개\n   → 리뷰 수가 경쟁상품의 절반 미만입니다.`);
    tasks.push('[중요] 리뷰 수 증가를 위한 고객 응대 및 리뷰 요청 활동');
  } else if (avgReviews > 0 && product.review_count < avgReviews * 0.8) {
    bottlenecks.push(`1. 리뷰 경쟁력\n   내 상품: ${product.review_count}개 / TOP10 평균: ${avgReviews}개\n   → 경쟁상품 평균의 80% 미만입니다.`);
    tasks.push('[보통] 리뷰 수 증가를 위한 고객 응대 개선');
  }

  // 가격 분석
  if (product.price && avgPrice && product.price > avgPrice * 1.1) {
    const diff = Math.round(((product.price - avgPrice) / avgPrice) * 100);
    bottlenecks.push(`2. 가격 경쟁력\n   내 상품: ${product.price.toLocaleString()}원 / TOP10 평균: ${avgPrice.toLocaleString()}원\n   → 평균보다 ${diff}% 높습니다.`);
    tasks.push('[중요] 경쟁상품 가격 대비 가격 경쟁력 검토');
  } else if (product.price && avgPrice && product.price < avgPrice * 0.9) {
    strengths.push(`가격 경쟁력 (TOP10 평균보다 ${Math.round(((avgPrice - product.price) / avgPrice) * 100)}% 저렴)`);
  }

  // 평점 분석
  if (product.rating < 4.0) {
    bottlenecks.push(`3. 평점\n   내 상품: ${product.rating}점 / TOP10 평균: ${avgRating}점\n   → 평점이 낮아 검색 노출에 불리할 수 있습니다.`);
    tasks.push('[중요] 평점 개선을 위한 제품 품질 및 리뷰 관리');
  } else if (product.rating >= 4.5) {
    strengths.push(`평점 ${product.rating}점 (우수)`);
  }

  // 배송 분석
  const freeShippingCount = top10.filter((c) => /무료/.test(c.shipping || '')).length;
  if (!/무료/.test(product.shipping || '') && freeShippingCount >= 5) {
    bottlenecks.push(`4. 배송\n   내 상품: ${product.shipping || '정보 없음'} / TOP10 중 ${freeShippingCount}개 무료배송\n   → 무료배송 경쟁상품이 다수입니다.`);
    tasks.push('[보통] 무료배송 또는 배송비 조건 검토');
  } else if (/무료/.test(product.shipping || '')) {
    strengths.push('무료배송');
  }

  // SEO 점수 분석
  if (seoAnalysis) {
    if (seoAnalysis.title_score < 70) {
      bottlenecks.push(`5. 상품명 최적화\n   SEO 상품명 점수: ${seoAnalysis.title_score}/100\n   → 상품명에 검색 키워드 구성이 부족할 수 있습니다.`);
      tasks.push('[중요] 상품명 키워드 구성 점검');
    } else if (seoAnalysis.title_score >= 80) {
      strengths.push('상품명 최적화 양호');
    }

    if (seoAnalysis.attribute_score < 60) {
      bottlenecks.push(`6. 상품 속성\n   SEO 속성 점수: ${seoAnalysis.attribute_score}/100\n   → 필수 속성 중 미등록 항목이 있을 수 있습니다.`);
      tasks.push('[보통] 미등록 상품속성 확인 및 입력');
    }

    if (seoAnalysis.completeness_score < 70) {
      tasks.push('[보통] 상품정보 입력 완성도 개선');
    }

    if (seoAnalysis.category_score < 70) {
      tasks.push('[보통] 카테고리 적합성 확인');
    }
  }

  // 브랜드
  if (product.brand) {
    strengths.push(`브랜드 인지도 (${product.brand})`);
  }

  // 키워드가 없는 경우
  if (keywords.length === 0) {
    bottlenecks.push('7. 키워드 추적\n   등록된 추적 키워드가 없습니다.');
    tasks.push('[중요] 검색 키워드 등록 및 순위 추적 시작');
  }

  // 최소 3개 작업 보장
  while (tasks.length < 3) {
    tasks.push('[보통] 경쟁상품 동향 지속 모니터링');
  }

  const bottlenecksText = bottlenecks.length > 0
    ? bottlenecks.join('\n\n')
    : '특별한 병목 요소가 발견되지 않았습니다. 현재 상태를 잘 유지하고 있습니다.';
  const strengthsText = strengths.length > 0
    ? strengths.join('\n')
    : '분석된 강점이 없습니다. 경쟁상품 데이터를 추가로 등록하면 더 정확한 분석이 가능합니다.';
  const tasksText = tasks.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n');

  return `현재 가장 큰 병목

${bottlenecksText}

현재 강점

${strengthsText}

오늘 해야 할 일 (최대 5개)

${tasksText}

---
본 분석은 자체 진단 기준에 의한 참고자료입니다. 네이버 공식 점수가 아니며, 인과관계를 단정하지 않습니다. 합법적인 SEO 개선 방법만 제안합니다.`;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [rankHistory, setRankHistory] = useState<RankingHistory[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [seoAnalysis, setSeoAnalysis] = useState<SeoAnalysis | null>(null);
  const [changes, setChanges] = useState<ProductChange[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [newKeyword, setNewKeyword] = useState('');
  const [newRank, setNewRank] = useState('');
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [prodRes, kwRes, rankRes, compRes, seoRes, changesRes, tasksRes] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).maybeSingle(),
      supabase.from('keywords').select('*').eq('product_id', productId).order('is_primary', { ascending: false }),
      supabase.from('ranking_history').select('*').eq('product_id', productId).order('recorded_at', { ascending: true }),
      supabase.from('competitors').select('*').eq('product_id', productId).order('observed_rank', { ascending: true }),
      supabase.from('seo_analysis').select('*').eq('product_id', productId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('product_changes').select('*').eq('product_id', productId).order('changed_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('product_id', productId).order('created_at', { ascending: false }),
    ]);

    setProduct(prodRes.data as unknown as Product);
    setKeywords((kwRes.data || []) as unknown as Keyword[]);
    setRankHistory((rankRes.data || []) as unknown as RankingHistory[]);
    setCompetitors((compRes.data || []) as unknown as Competitor[]);
    setSeoAnalysis(seoRes.data as unknown as SeoAnalysis);
    setChanges((changesRes.data || []) as unknown as ProductChange[]);
    setTasks((tasksRes.data || []) as unknown as Task[]);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (keywords.length > 0 && !selectedKeywordId) {
      setSelectedKeywordId(keywords[0].id);
    }
  }, [keywords, selectedKeywordId]);

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;
    await supabase.from('keywords').insert({
      product_id: productId,
      keyword: newKeyword.trim(),
      is_primary: false,
    });
    setNewKeyword('');
    loadData();
  };

  const handleDeleteKeyword = async (id: string) => {
    if (!confirm('이 키워드를 삭제하시겠습니까?')) return;
    await supabase.from('keywords').delete().eq('id', id);
    loadData();
  };

  const handleAddRank = async () => {
    if (!selectedKeywordId || !newRank) return;
    await supabase.from('ranking_history').insert({
      product_id: productId,
      keyword_id: selectedKeywordId,
      observed_rank: parseInt(newRank, 10),
      recorded_at: new Date().toISOString().split('T')[0],
    });
    setNewRank('');
    await refreshSeoScore(productId);
    loadData();
  };

  const handleAddTask = async () => {
    const title = prompt('작업 제목을 입력하세요');
    if (!title) return;
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('tasks').insert({
      product_id: productId,
      user_id: session?.user.id,
      task_title: title,
      priority: 'normal',
    });
    loadData();
  };

  const handleToggleTask = async (id: string, currentStatus: string) => {
    await supabase.from('tasks').update({ status: currentStatus === 'pending' ? 'done' : 'pending' }).eq('id', id);
    loadData();
  };

  const handleDeleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    loadData();
  };

  const handleAiAnalysis = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const analysis = generateLocalAnalysis(product, keywords, competitors, seoAnalysis);
      await new Promise((resolve) => setTimeout(resolve, 600));
      setAiResult(analysis);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-400 text-sm">데이터를 불러오는 중...</div>;
  }

  if (!product) {
    return <div className="text-center py-12 text-gray-500">상품을 찾을 수 없습니다.</div>;
  }

  const latestRanksByKeyword = new Map<string, RankingHistory>();
  for (const r of [...rankHistory].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())) {
    if (!latestRanksByKeyword.has(r.keyword_id)) {
      latestRanksByKeyword.set(r.keyword_id, r);
    }
  }

  const primaryKeyword = keywords.find((k) => k.is_primary) || keywords[0];
  const chartKeywordId = selectedKeywordId || primaryKeyword?.id;
  const chartData = chartKeywordId ? rankHistory.filter((r) => r.keyword_id === chartKeywordId) : [];
  const chartKeyword = keywords.find((k) => k.id === chartKeywordId);

  const titleAnalysis = product.product_name
    ? analyzeTitle(product.product_name, product.brand || '', product.primary_keyword || '')
    : null;

  const top10Competitors = competitors.slice(0, 10);
  const competitorAvgPrice = top10Competitors.length > 0
    ? Math.round(top10Competitors.reduce((s, c) => s + (c.price || 0), 0) / top10Competitors.length)
    : 0;
  const competitorAvgReviews = top10Competitors.length > 0
    ? Math.round(top10Competitors.reduce((s, c) => s + (c.review_count || 0), 0) / top10Competitors.length)
    : 0;
  const competitorAvgRating = top10Competitors.length > 0
    ? (top10Competitors.reduce((s, c) => s + (c.rating || 0), 0) / top10Competitors.length).toFixed(1)
    : '0';
  const freeShippingCount = top10Competitors.filter((c) => /무료/.test(c.shipping || '')).length;

  const priceDiff = product.price && competitorAvgPrice
    ? Math.round(((product.price - competitorAvgPrice) / competitorAvgPrice) * 100)
    : 0;

  const radarData: Record<string, { mine: number; competitor: number }> = {
    SEO: { mine: seoAnalysis?.total_score || 0, competitor: 70 },
    가격: {
      mine: product.price && competitorAvgPrice ? Math.max(0, 100 - Math.abs(priceDiff) * 2) : 50,
      competitor: 70,
    },
    리뷰: {
      mine: product.review_count && competitorAvgReviews
        ? Math.min(100, Math.round((product.review_count / competitorAvgReviews) * 100))
        : 30,
      competitor: 70,
    },
    평점: {
      mine: Math.round((product.rating / 5) * 100),
      competitor: Math.round((parseFloat(competitorAvgRating) / 5) * 100),
    },
    배송: {
      mine: /무료/.test(product.shipping || '') ? 100 : 50,
      competitor: Math.round((freeShippingCount / 10) * 100),
    },
    상품정보: { mine: seoAnalysis?.completeness_score || 0, competitor: 70 },
  };

  const scoreItems = [
    { label: '상품명', score: seoAnalysis?.title_score || 0, weight: 25 },
    { label: '카테고리', score: seoAnalysis?.category_score || 0, weight: 15 },
    { label: '브랜드/제조사', score: seoAnalysis?.brand_score || 0, weight: 10 },
    { label: '속성', score: seoAnalysis?.attribute_score || 0, weight: 15 },
    { label: '가격', score: seoAnalysis?.price_score || 0, weight: 10 },
    { label: '리뷰', score: seoAnalysis?.review_score || 0, weight: 10 },
    { label: '배송', score: seoAnalysis?.shipping_score || 0, weight: 10 },
    { label: '완성도', score: seoAnalysis?.completeness_score || 0, weight: 5 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{product.product_name}</h1>
          <p className="text-sm text-gray-500">상품 ID: {product.naver_product_id || '-'}</p>
        </div>
        <Link href={`/products/${product.id}/edit`}>
          <Button variant="outline">
            <Pencil className="w-4 h-4 mr-2" />
            수정
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Package className="w-4 h-4 mr-1.5" /> 기본 정보
          </TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Search className="w-4 h-4 mr-1.5" /> SEO 적합도
          </TabsTrigger>
          <TabsTrigger value="title" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Search className="w-4 h-4 mr-1.5" /> 상품명 분석
          </TabsTrigger>
          <TabsTrigger value="keywords" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TrendingUp className="w-4 h-4 mr-1.5" /> 키워드/순위
          </TabsTrigger>
          <TabsTrigger value="competitors" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-1.5" /> 경쟁상품
          </TabsTrigger>
          <TabsTrigger value="radar" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TrendingUp className="w-4 h-4 mr-1.5" /> 경쟁력 레이더
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Sparkles className="w-4 h-4 mr-1.5" /> AI 분석
          </TabsTrigger>
          <TabsTrigger value="changes" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <History className="w-4 h-4 mr-1.5" /> 변경이력
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4 mr-1.5" /> 할 일
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden mb-4">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <h2 className="font-bold text-gray-900 mb-2">{product.product_name}</h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mb-3 ${getStatusColor(product.status)}`}>
                  {getStatusLabel(product.status)} (내부 진단 상태)
                </span>
                <div className="w-full pt-3 border-t border-gray-100 text-sm text-left space-y-1.5">
                  <div className="flex justify-between"><span className="text-gray-500">상품 ID</span><span className="font-medium">{product.naver_product_id || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">카테고리</span><span className="font-medium">{product.category || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">판매가</span><span className="font-medium">{formatPrice(product.price)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">브랜드</span><span className="font-medium">{product.brand || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">제조사</span><span className="font-medium">{product.manufacturer || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">리뷰수</span><span className="font-medium">{formatNumber(product.review_count)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">평점</span><span className="font-medium">{product.rating}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">배송</span><span className="font-medium">{product.shipping || '-'}</span></div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="관찰 순위" value={formatRank(latestRanksByKeyword.get(primaryKeyword?.id || '')?.observed_rank)} icon={<TrendingUp className="w-5 h-5" />} />
                <StatCard title="SEO 자체점수" value={`${seoAnalysis?.total_score || 0}점`} icon={<Search className="w-5 h-5" />} />
                <StatCard title="추적 키워드" value={`${keywords.length}개`} icon={<TrendingUp className="w-5 h-5" />} />
                <StatCard title="경쟁상품" value={`${competitors.length}개`} icon={<Users className="w-5 h-5" />} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">최근 관찰 순위</CardTitle>
                </CardHeader>
                <CardContent>
                  <RankChart data={chartData} events={changes} keywordLabel={chartKeyword?.keyword} height={250} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-6 mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">SEO 자체진단</h2>
                  <Badge variant="secondary" className="text-xs">자체 진단 점수</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => { await refreshSeoScore(productId); loadData(); }}
                >
                  점수 재계산
                </Button>
              </div>
              <p className="text-xs text-gray-500 mb-6">
                본 점수는 네이버 공식 점수가 아니며, 자체 진단 기준에 의한 참고 지표입니다.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                      <circle
                        cx="80" cy="80" r="70" fill="none"
                        stroke={seoAnalysis && seoAnalysis.total_score >= 80 ? '#22c55e' : seoAnalysis && seoAnalysis.total_score >= 60 ? '#3b82f6' : seoAnalysis && seoAnalysis.total_score >= 40 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="12"
                        strokeDasharray={`${((seoAnalysis?.total_score || 0) / 100) * 440} 440`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-bold ${getScoreColor(seoAnalysis?.total_score || 0)}`}>{seoAnalysis?.total_score || 0}</span>
                      <span className="text-sm text-gray-400">/ 100</span>
                    </div>
                  </div>
                  <span className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(product.status)}`}>
                    {getStatusLabel(product.status)} (내부 진단 상태)
                  </span>
                </div>

                <div className="space-y-3">
                  {scoreItems.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{item.label} <span className="text-gray-400 text-xs">({item.weight}점)</span></span>
                        <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}점</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getScoreBgColor(item.score)}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Title Analysis */}
        <TabsContent value="title" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">현재 상품명</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-gray-50 text-lg font-medium text-gray-900 mb-4">
                &ldquo;{product.product_name}&rdquo;
              </div>
              {titleAnalysis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">브랜드</div>
                    <div className="text-sm font-medium text-gray-900">{titleAnalysis.brand || '-'}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">대표 키워드</div>
                    <div className="text-sm font-medium text-gray-900">{titleAnalysis.primary_keyword || '-'}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">보조 키워드</div>
                    <div className="text-sm font-medium text-gray-900">{titleAnalysis.secondary_keywords.join(', ') || '-'}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">속성</div>
                    <div className="text-sm font-medium text-gray-900">{titleAnalysis.attributes.join(', ') || '-'}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">상품명 진단</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {titleAnalysis?.diagnosis.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  {d}
                </div>
              ))}
              {titleAnalysis && titleAnalysis.duplicate_keywords.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4" />
                  중복 가능 키워드: {titleAnalysis.duplicate_keywords.join(', ')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-sky-200 bg-sky-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-sky-600" />
                <CardTitle className="text-base">추천 상품명 (참고용)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-white border border-sky-200 text-lg font-medium text-gray-900">
                &ldquo;{titleAnalysis?.recommended_title || product.product_name}&rdquo;
              </div>
              <p className="text-xs text-gray-500 mt-3">
                AI 제안은 참고자료입니다. 실제 적용 전 네이버 쇼핑 정책을 확인하세요.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keywords & Rankings */}
        <TabsContent value="keywords" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">추적 키워드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="새 키워드 입력"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
                />
                <Button onClick={handleAddKeyword} className="bg-sky-500 hover:bg-sky-600">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">키워드</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">현재 순위</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600 hidden md:table-cell">최고</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600 hidden md:table-cell">최저</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600 hidden lg:table-cell">7일 변화</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600 hidden lg:table-cell">30일 변화</th>
                      <th className="text-right py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw) => {
                      const kwRanks = rankHistory.filter((r) => r.keyword_id === kw.id).sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                      const current = kwRanks[kwRanks.length - 1]?.observed_rank;
                      const previous = kwRanks[kwRanks.length - 2]?.observed_rank;
                      const best = kwRanks.length > 0 ? Math.min(...kwRanks.map((r) => r.observed_rank)) : null;
                      const worst = kwRanks.length > 0 ? Math.max(...kwRanks.map((r) => r.observed_rank)) : null;
                      const sevenDaysAgo = kwRanks[kwRanks.length - 8]?.observed_rank;
                      const thirtyDaysAgo = kwRanks[kwRanks.length - 31]?.observed_rank;
                      const change7d = current && sevenDaysAgo ? sevenDaysAgo - current : null;
                      const change30d = current && thirtyDaysAgo ? thirtyDaysAgo - current : null;
                      return (
                        <tr key={kw.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {kw.is_primary && <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 text-xs">대표</Badge>}
                              <span className="font-medium text-gray-900">{kw.keyword}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-medium">{formatRank(current)}</td>
                          <td className="py-2 px-3 text-center hidden md:table-cell">{formatRank(best)}</td>
                          <td className="py-2 px-3 text-center hidden md:table-cell">{formatRank(worst)}</td>
                          <td className="py-2 px-3 text-center hidden lg:table-cell">
                            {change7d !== null && <span className={change7d > 0 ? 'text-green-600' : change7d < 0 ? 'text-red-600' : 'text-gray-500'}>{formatChange(change7d)}</span>}
                          </td>
                          <td className="py-2 px-3 text-center hidden lg:table-cell">
                            {change30d !== null && <span className={change30d > 0 ? 'text-green-600' : change30d < 0 ? 'text-red-600' : 'text-gray-500'}>{formatChange(change30d)}</span>}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteKeyword(kw.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">관찰 순위 그래프</CardTitle>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Info className="w-3.5 h-3.5" />
                  <span>네이버 쇼핑 결과는 개인화, 로그인 상태, 디바이스, 시점에 따라 달라질 수 있습니다.</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <button
                    key={kw.id}
                    onClick={() => setSelectedKeywordId(kw.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedKeywordId === kw.id ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {kw.keyword}
                  </button>
                ))}
              </div>
              <RankChart data={chartData} events={changes} keywordLabel={chartKeyword?.keyword} height={300} />

              <div className="flex flex-col sm:flex-row gap-2 items-end pt-4 border-t border-gray-100">
                <div className="flex-1 w-full">
                  <Label className="text-xs text-gray-500">관찰 순위 기록 추가</Label>
                  <Input
                    type="number"
                    placeholder="예: 18 (순위)"
                    value={newRank}
                    onChange={(e) => setNewRank(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddRank} className="bg-sky-500 hover:bg-sky-600">
                  기록 추가
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competitors */}
        <TabsContent value="competitors" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatCard title="내 상품 가격" value={formatPrice(product.price)} />
            <StatCard title="TOP10 평균 가격" value={formatPrice(competitorAvgPrice)} />
            <StatCard title="가격 차이" value={`${priceDiff > 0 ? '+' : ''}${priceDiff}%`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatCard title="내 상품 리뷰" value={formatNumber(product.review_count)} />
            <StatCard title="TOP10 평균 리뷰" value={formatNumber(competitorAvgReviews)} />
            <StatCard title="내 상품 평점" value={`${product.rating}점`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">경쟁상품 목록 (최대 30개)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">상품명</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600 hidden md:table-cell">가격</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600 hidden md:table-cell">리뷰</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600 hidden lg:table-cell">평점</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600 hidden lg:table-cell">배송</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">관찰 순위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((comp) => (
                      <tr key={comp.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <div className="font-medium text-gray-900 truncate max-w-[200px]">{comp.product_name}</div>
                          <div className="text-xs text-gray-500">{comp.seller}</div>
                        </td>
                        <td className="py-2 px-3 text-right hidden md:table-cell">{formatPrice(comp.price)}</td>
                        <td className="py-2 px-3 text-right hidden md:table-cell">{formatNumber(comp.review_count)}</td>
                        <td className="py-2 px-3 text-center hidden lg:table-cell">{comp.rating}</td>
                        <td className="py-2 px-3 text-center hidden lg:table-cell text-xs">{comp.shipping}</td>
                        <td className="py-2 px-3 text-center font-medium">{formatRank(comp.observed_rank)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Radar */}
        <TabsContent value="radar" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">경쟁력 레이더 분석 - 내 상품 VS TOP10 평균</CardTitle>
            </CardHeader>
            <CardContent>
              <CompetitivenessRadar data={radarData} height={400} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500 mb-2">배송 비교</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>내 상품</span><span className="font-medium">{product.shipping || '-'}</span></div>
                  <div className="flex justify-between"><span>TOP10</span><span className="font-medium">{freeShippingCount}/10 무료배송</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500 mb-2">리뷰 비교</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>내 상품</span><span className="font-medium">{formatNumber(product.review_count)}</span></div>
                  <div className="flex justify-between"><span>TOP10 평균</span><span className="font-medium">{formatNumber(competitorAvgReviews)}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500 mb-2">가격 비교</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>내 상품</span><span className="font-medium">{formatPrice(product.price)}</span></div>
                  <div className="flex justify-between"><span>TOP10 평균</span><span className="font-medium">{formatPrice(competitorAvgPrice)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Analysis */}
        <TabsContent value="ai" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-600" />
                  <CardTitle className="text-base">AI 병목 분석</CardTitle>
                </div>
                <Button onClick={handleAiAnalysis} disabled={aiLoading} className="bg-sky-500 hover:bg-sky-600">
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  AI 분석 실행
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm mb-4">
                  <AlertCircle className="w-4 h-4" />
                  {aiError}
                </div>
              )}
              {!aiResult && !aiError && !aiLoading && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  AI 분석 버튼을 눌러 상품의 병목 요소와 강점을 분석하세요.
                  <p className="mt-2 text-xs text-gray-400">AI 제안은 참고자료입니다.</p>
                </div>
              )}
              {aiLoading && (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">AI가 분석 중입니다...</p>
                </div>
              )}
              {aiResult && (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-gray-700 p-4 rounded-lg bg-gray-50 border border-gray-200">
                    {aiResult}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">AI 분석 결과는 참고자료입니다.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">오늘 해야 할 일 (최대 5개)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  할 일이 없습니다.
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={handleAddTask}>
                      <Plus className="w-4 h-4 mr-1" /> 할 일 추가
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {tasks.slice(0, 5).map((task, i) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.task_title}</div>
                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border mt-1 ${getPriorityColor(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => handleToggleTask(task.id, task.status)}>
                          {task.status === 'pending' ? '완료' : '취소'}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={handleAddTask} className="mt-2">
                    <Plus className="w-4 h-4 mr-1" /> 할 일 추가
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Changes */}
        <TabsContent value="changes" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">변경 이력</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {changes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">변경 이력이 없습니다.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {changes.map((change) => (
                    <div key={change.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                      <div className="text-sm text-gray-500 w-24 flex-shrink-0">{formatDateFull(change.changed_at)}</div>
                      <div className="w-24 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">{change.change_type}</Badge>
                      </div>
                      <div className="flex-1 min-w-0 text-sm">
                        <span className="text-gray-500 line-through">{change.old_value}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-medium text-gray-900">{change.new_value}</span>
                        {change.memo && <div className="text-xs text-gray-400 mt-1">{change.memo}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">작업 관리</CardTitle>
                <Button size="sm" variant="outline" onClick={handleAddTask}>
                  <Plus className="w-4 h-4 mr-1" /> 할 일 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">등록된 작업이 없습니다.</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={() => handleToggleTask(task.id, task.status)}
                      className="w-4 h-4 rounded accent-sky-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.task_title}</div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border mt-1 ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
