import ProductDetailClient from './product-detail-client';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <ProductDetailClient />;
}
