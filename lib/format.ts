import type { Product } from './types';

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '-';
  return `${price.toLocaleString('ko-KR')}원`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  return n.toLocaleString('ko-KR');
}

export function formatRank(rank: number | null | undefined): string {
  if (rank === null || rank === undefined) return '-';
  return `${rank}위`;
}

export function formatChange(change: number | null | undefined): string {
  if (change === null || change === undefined || change === 0) return '0';
  const sign = change > 0 ? '▲' : '▼';
  return `${sign} ${Math.abs(change)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateFull(date: string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    good: '좋음',
    observe: '관찰 필요',
    improve: '개선 필요',
    critical: '심각',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    good: 'bg-green-100 text-green-700 border-green-200',
    observe: 'bg-blue-100 text-blue-700 border-blue-200',
    improve: 'bg-amber-100 text-amber-700 border-amber-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
  };
  return colors[status] || colors.observe;
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: '높음',
    normal: '보통',
    low: '낮음',
  };
  return labels[priority] || priority;
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    normal: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return colors[priority] || colors.normal;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function getProductImageUrl(product: Partial<Product>): string {
  if (product.image_url) return product.image_url;
  return '/placeholder-product.svg';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
