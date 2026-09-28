import { Suspense } from 'react';
import EditProductClient from './edit-product-client';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-400 text-sm">불러오는 중...</div>}>
      <EditProductClient />
    </Suspense>
  );
}
