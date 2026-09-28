'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { History, Plus, Trash2 } from 'lucide-react';
import { formatDateFull, getStatusLabel } from '@/lib/format';
import type { Product, ProductChange } from '@/lib/types';

export default function ChangesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [changes, setChanges] = useState<ProductChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChange, setNewChange] = useState({
    change_type: '',
    old_value: '',
    new_value: '',
    memo: '',
    changed_at: new Date().toISOString().split('T')[0],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const [prodRes, changesRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('product_changes').select('*').order('changed_at', { ascending: false }),
    ]);

    const prods = (prodRes.data || []) as unknown as Product[];
    setProducts(prods);
    setChanges((changesRes.data || []) as unknown as ProductChange[]);
    if (prods.length > 0 && !selectedProductId) setSelectedProductId(prods[0].id);
    setLoading(false);
  }, [selectedProductId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = selectedProductId
    ? changes.filter((c) => c.product_id === selectedProductId)
    : changes;

  const groupedByDate = filtered.reduce((acc, change) => {
    if (!acc[change.changed_at]) acc[change.changed_at] = [];
    acc[change.changed_at].push(change);
    return acc;
  }, {} as Record<string, ProductChange[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const handleAddChange = async () => {
    if (!selectedProductId || !newChange.change_type) return;
    await supabase.from('product_changes').insert({
      product_id: selectedProductId,
      change_type: newChange.change_type,
      old_value: newChange.old_value || null,
      new_value: newChange.new_value || null,
      memo: newChange.memo || null,
      changed_at: newChange.changed_at,
    });
    setShowAddForm(false);
    setNewChange({ change_type: '', old_value: '', new_value: '', memo: '', changed_at: new Date().toISOString().split('T')[0] });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 변경 이력을 삭제하시겠습니까?')) return;
    await supabase.from('product_changes').delete().eq('id', id);
    loadData();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">변경 이력</h1>
          <p className="text-sm text-gray-500 mt-1">상품별 변경 사항을 기록하고 추적하세요.</p>
        </div>
        <Button className="bg-sky-500 hover:bg-sky-600" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-2" /> 변경 기록 추가
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Label className="text-xs text-gray-500">상품 선택</Label>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">전체 상품</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.product_name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {showAddForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">변경 기록 추가</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">변경 항목</Label><Input value={newChange.change_type} onChange={(e) => setNewChange({ ...newChange, change_type: e.target.value })} placeholder="예: 가격, 상품명, 대표이미지" /></div>
              <div className="space-y-1"><Label className="text-xs">날짜</Label><Input type="date" value={newChange.changed_at} onChange={(e) => setNewChange({ ...newChange, changed_at: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">이전값</Label><Input value={newChange.old_value} onChange={(e) => setNewChange({ ...newChange, old_value: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">변경값</Label><Input value={newChange.new_value} onChange={(e) => setNewChange({ ...newChange, new_value: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">메모</Label><Input value={newChange.memo} onChange={(e) => setNewChange({ ...newChange, memo: e.target.value })} placeholder="변경 사유 등" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>취소</Button>
              <Button className="bg-sky-500 hover:bg-sky-600" onClick={handleAddChange}>추가</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>
      ) : sortedDates.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">변경 이력이 없습니다.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="text-sm text-gray-500">{formatDateFull(date)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedByDate[date].map((change) => {
                  const product = products.find((p) => p.id === change.product_id);
                  return (
                    <div key={change.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                      <Badge variant="secondary" className="text-xs flex-shrink-0">{change.change_type}</Badge>
                      <div className="flex-1 min-w-0 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-500 line-through">{change.old_value || '-'}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-gray-900">{change.new_value || '-'}</span>
                        </div>
                        {change.memo && <div className="text-xs text-gray-400 mt-1">{change.memo}</div>}
                        {product && (
                          <Link href={`/products/detail/?id=${product.id}`} className="text-xs text-sky-600 hover:text-sky-700 mt-1 inline-block">
                            {product.product_name}
                          </Link>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 flex-shrink-0" onClick={() => handleDelete(change.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
