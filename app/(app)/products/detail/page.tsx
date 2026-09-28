import { Suspense } from 'react';
import ProductDetailClient from './product-detail-client';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-400 text-sm">불러오는 중...</div>}>
      <ProductDetailClient />
    </Suspense>
  );
}
