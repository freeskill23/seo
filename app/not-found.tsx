'use client';

import { useEffect } from 'react';

export default function NotFound() {
  useEffect(() => {
    const path = window.location.pathname;
    const basePath = '/seo';
    if (path.startsWith(basePath) && !path.endsWith('/404.html')) {
      const route = path.slice(basePath.length);
      window.location.replace(basePath + '/?redirect=' + encodeURIComponent(route));
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <p className="text-gray-400 text-sm">페이지를 불러오는 중...</p>
      </div>
    </div>
  );
}
