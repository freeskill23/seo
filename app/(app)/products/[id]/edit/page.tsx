import EditProductClient from './edit-product-client';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <EditProductClient />;
}
