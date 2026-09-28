'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Save, Loader2, Info } from 'lucide-react';
import type { ScoreWeights, OpportunityWeights } from '@/lib/types';

const DEFAULT_WEIGHTS: ScoreWeights = {
  title: 25,
  category: 15,
  brand: 10,
  attribute: 15,
  price: 10,
  review: 10,
  shipping: 10,
  completeness: 5,
};

const DEFAULT_OPP_WEIGHTS: OpportunityWeights = {
  search_demand: 40,
  competition: 30,
  exposure: 30,
};

export default function SettingsPage() {
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [oppWeights, setOppWeights] = useState<OpportunityWeights>(DEFAULT_OPP_WEIGHTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (data) {
      setWeights({ ...DEFAULT_WEIGHTS, ...(data.weights as ScoreWeights) });
      setOppWeights({ ...DEFAULT_OPP_WEIGHTS, ...(data.opportunity_weights as OpportunityWeights) });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    const oppSum = Object.values(oppWeights).reduce((a, b) => a + b, 0);

    if (weightSum !== 100) {
      alert('SEO 점수 가중치의 합이 100이어야 합니다.');
      setSaving(false);
      return;
    }
    if (oppSum !== 100) {
      alert('기회 점수 가중치의 합이 100이어야 합니다.');
      setSaving(false);
      return;
    }

    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('settings').update({ weights, opportunity_weights: oppWeights }).eq('id', existing.id);
    } else {
      await supabase.from('settings').insert({ user_id: session.user.id, weights, opportunity_weights: oppWeights });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS);
    setOppWeights(DEFAULT_OPP_WEIGHTS);
  };

  const weightLabels: Record<string, string> = {
    title: '상품명',
    category: '카테고리',
    brand: '브랜드/제조사',
    attribute: '속성',
    price: '가격',
    review: '리뷰',
    shipping: '배송',
    completeness: '완성도',
  };

  const oppWeightLabels: Record<string, string> = {
    search_demand: '검색 수요',
    competition: '경쟁도',
    exposure: '현재 노출 가능성',
  };

  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const oppSum = Object.values(oppWeights).reduce((a, b) => a + b, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-400 text-sm">불러오는 중...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-1">점수 가중치를 변경할 수 있습니다.</p>
      </div>

      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p>가중치의 합이 100이 되도록 설정하세요. 변경된 가중치는 이후 점수 재계산 시 적용됩니다.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO 자체진단 점수 가중치</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(weights) as Array<keyof ScoreWeights>).map((key) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label className="text-sm flex-shrink-0 w-24">{weightLabels[key]}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={weights[key]}
                onChange={(e) => setWeights({ ...weights, [key]: parseInt(e.target.value || '0', 10) })}
                className="w-24"
              />
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${weights[key]}%` }} />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-600">합계</span>
            <span className={`text-lg font-bold ${weightSum === 100 ? 'text-green-600' : 'text-red-600'}`}>{weightSum}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">키워드 기회 점수 가중치</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(oppWeights) as Array<keyof OpportunityWeights>).map((key) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label className="text-sm flex-shrink-0 w-32">{oppWeightLabels[key]}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={oppWeights[key]}
                onChange={(e) => setOppWeights({ ...oppWeights, [key]: parseInt(e.target.value || '0', 10) })}
                className="w-24"
              />
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${oppWeights[key]}%` }} />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-600">합계</span>
            <span className={`text-lg font-bold ${oppSum === 100 ? 'text-green-600' : 'text-red-600'}`}>{oppSum}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>기본값으로 초기화</Button>
        <Button className="bg-sky-500 hover:bg-sky-600" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? '저장됨' : '저장'}
        </Button>
      </div>
    </div>
  );
}
