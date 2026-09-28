'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Tags,
  TrendingUp,
  Users,
  Search,
  History,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  ChartLine,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/products', label: '상품', icon: Package },
  { href: '/keywords', label: '키워드', icon: Tags },
  { href: '/rankings', label: '순위추적', icon: TrendingUp },
  { href: '/competitors', label: '경쟁상품', icon: Users },
  { href: '/seo', label: 'SEO 분석', icon: Search },
  { href: '/changes', label: '변경이력', icon: History },
  { href: '/reports', label: '리포트', icon: FileText },
  { href: '/settings', label: '설정', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500 text-white">
          <ChartLine className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">쇼핑 SEO 분석</div>
          <div className="text-[10px] text-gray-500">네이버 쇼핑 자체진단 도구</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-0.5',
                isActive
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn('w-[18px] h-[18px]', isActive ? 'text-sky-600' : 'text-gray-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3">
        {user && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-gray-50">
            <div className="text-xs text-gray-500">로그인됨</div>
            <div className="text-sm font-medium text-gray-700 truncate">{user.email}</div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px] text-gray-400" />
          로그아웃
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block w-64 flex-shrink-0 border-r border-gray-200 bg-white">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </div>

      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <div className="relative w-64 h-full">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              {sidebarContent}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
