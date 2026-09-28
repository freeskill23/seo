'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { refreshSeoScore } from '@/lib/seo-actions';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    naver_product_id: '',
    product_name: '',
    product_url: '',
    primary_keyword: '',
    additional_keywords: '',
    category: '',
    price: '',
    brand: '',
    manufacturer: '',
    shipping: '무료배송',
    image_url: '',
    review_count: '0',
    rating: '0',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setError('로그인이 필요합니다.');
      setLoading(false);
      return;
    }

    const { data: product, error: insertErr } = await supabase
      .from('products')
      .insert({
        user_id: session.user.id,
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
      .select()
      .single();

    if (insertErr || !product) {
      setError(insertErr?.message || '상품 등록에 실패했습니다.');
      setLoading(false);
      return;
    }

    if (form.primary_keyword) {
      await supabase.from('keywords').insert({
        product_id: product.id,
        keyword: form.primary_keyword,
        is_primary: true,
      });
    }

    const additionalKws = form.additional_keywords
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (additionalKws.length > 0) {
      await supabase.from('keywords').insert(
        additionalKws.map((kw) => ({
          product_id: product.id,
          keyword: kw,
          is_primary: false,
        }))
      );
    }

    await refreshSeoScore(product.id);

    router.push(`/products/detail/?id=${product.id}`);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 등록</h1>
          <p className="text-sm text-gray-500 mt-1">분석할 상품 정보를 입력하세요.</p>
        </div>
      </div>

      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p>
              상품 ID만 입력한 경우 자동 데이터 수집이 가능한 데이터 커넥터가 있으면 정보를 가져오고,
              없으면 직접 입력할 수 있습니다. 현재는 수동 입력(CSV 업로드 지원) 방식을 사용합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
            <CardDescription>네이버 쇼핑에 등록된 상품의 정보를 입력하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="naver_product_id">네이버 상품 ID</Label>
                <Input
                  id="naver_product_id"
                  value={form.naver_product_id}
                  onChange={(e) => handleChange('naver_product_id', e.target.value)}
                  placeholder="예: 12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_url">상품 URL</Label>
                <Input
                  id="product_url"
                  value={form.product_url}
                  onChange={(e) => handleChange('product_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_name">상품명 *</Label>
              <Input
                id="product_name"
                value={form.product_name}
                onChange={(e) => handleChange('product_name', e.target.value)}
                placeholder="예: 펫홈 원목 강아지집 애견하우스 실내 강아지 집 중형견"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_keyword">대표 키워드</Label>
                <Input
                  id="primary_keyword"
                  value={form.primary_keyword}
                  onChange={(e) => handleChange('primary_keyword', e.target.value)}
                  placeholder="예: 강아지집"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional_keywords">추가 키워드 (쉼표 또는 줄바꿈)</Label>
                <Input
                  id="additional_keywords"
                  value={form.additional_keywords}
                  onChange={(e) => handleChange('additional_keywords', e.target.value)}
                  placeholder="원목 강아지집, 애견하우스, 실내 강아지집"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="예: 반려동물/강아지/집"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">판매가</Label>
                <Input
                  id="price"
                  type="number"
                  value={form.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="예: 119000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">브랜드</Label>
                <Input
                  id="brand"
                  value={form.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                  placeholder="예: 펫홈"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">제조사</Label>
                <Input
                  id="manufacturer"
                  value={form.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  placeholder="예: 펫홈"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping">배송정보</Label>
                <Input
                  id="shipping"
                  value={form.shipping}
                  onChange={(e) => handleChange('shipping', e.target.value)}
                  placeholder="예: 무료배송"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="review_count">리뷰수</Label>
                <Input
                  id="review_count"
                  type="number"
                  value={form.review_count}
                  onChange={(e) => handleChange('review_count', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">평점</Label>
                <Input
                  id="rating"
                  type="number"
                  step="0.1"
                  max="5"
                  value={form.rating}
                  onChange={(e) => handleChange('rating', e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">이미지 URL</Label>
                <Input
                  id="image_url"
                  value={form.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Link href="/products">
            <Button variant="outline" type="button">취소</Button>
          </Link>
          <Button type="submit" className="bg-sky-500 hover:bg-sky-600" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            상품 분석 시작
          </Button>
        </div>
      </form>
    </div>
  );
}
