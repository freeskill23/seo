'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { refreshSeoScore } from '@/lib/seo-actions';
import type { Product } from '@/lib/types';

export default function EditProductPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get('id') as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    naver_product_id: '',
    product_name: '',
    product_url: '',
    primary_keyword: '',
    category: '',
    price: '',
    brand: '',
    manufacturer: '',
    shipping: '',
    image_url: '',
    review_count: '0',
    rating: '0',
  });

  useEffect(() => {
    supabase.from('products').select('*').eq('id', productId).maybeSingle().then(({ data }) => {
      if (data) {
        const p = data as unknown as Product;
        setForm({
          naver_product_id: p.naver_product_id || '',
          product_name: p.product_name || '',
          product_url: p.product_url || '',
          primary_keyword: p.primary_keyword || '',
          category: p.category || '',
          price: p.price?.toString() || '',
          brand: p.brand || '',
          manufacturer: p.manufacturer || '',
          shipping: p.shipping || '',
          image_url: p.image_url || '',
          review_count: p.review_count?.toString() || '0',
          rating: p.rating?.toString() || '0',
        });
      }
      setLoading(false);
    });
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const { error: updateErr } = await supabase
      .from('products')
      .update({
        naver_product_id: form.naver_product_id || null,
        product_name: form.product_name,
        product_url: form.product_url || null,
        primary_keyword: form.primary_keyword || null,
        category: form.category || null,
        price: form.price ? parseInt(form.price, 10) : null,
        brand: form.brand || null,
        manufacturer: form.manufacturer || null,
        shipping: form.shipping || null,
        image_url: form.image_url || null,
        review_count: parseInt(form.review_count || '0', 10),
        rating: parseFloat(form.rating || '0'),
      })
      .eq('id', productId);

    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }

    await refreshSeoScore(productId);
    router.push(`/products/detail/?id=${productId}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-400 text-sm">불러오는 중...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/products/detail/?id=${productId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 수정</h1>
          <p className="text-sm text-gray-500 mt-1">상품 정보를 수정하세요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>네이버 상품 ID</Label>
                <Input value={form.naver_product_id} onChange={(e) => setForm({ ...form, naver_product_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>상품 URL</Label>
                <Input value={form.product_url} onChange={(e) => setForm({ ...form, product_url: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>상품명 *</Label>
              <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>대표 키워드</Label>
                <Input value={form.primary_keyword} onChange={(e) => setForm({ ...form, primary_keyword: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>판매가</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>배송정보</Label>
                <Input value={form.shipping} onChange={(e) => setForm({ ...form, shipping: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>브랜드</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>제조사</Label>
                <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>이미지 URL</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>리뷰수</Label>
                <Input type="number" value={form.review_count} onChange={(e) => setForm({ ...form, review_count: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>평점</Label>
                <Input type="number" step="0.1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        <div className="flex justify-end gap-3 mt-6">
          <Link href={`/products/detail/?id=${productId}`}>
            <Button variant="outline" type="button">취소</Button>
          </Link>
          <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            저장
          </Button>
        </div>
      </form>
    </div>
  );
}
