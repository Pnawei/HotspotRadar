'use client';

// 响应式导航栏
// 桌面：Logo + 水平导航 + 刷新 + 主题切换
// 移动：Logo + 主题切换 + 抽屉菜单

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Flame, TrendingUp, Layers, RefreshCw, Menu, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo, LogoMark } from './logo';
import { ThemeToggle } from './theme-toggle';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

interface NavbarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const NAV_ITEMS = [
  { href: '/', label: '热点', icon: Flame, description: '全网实时热搜榜' },
  { href: '/trend', label: '趋势', icon: TrendingUp, description: '热度涨跌风向标' },
  { href: '/platforms', label: '平台', icon: Layers, description: '数据源状态总览' },
];

export function Navbar({ onRefresh, isRefreshing }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="page-container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5" aria-label="热点雷达首页">
          <LogoMark size={36} animated className="transition-transform duration-500 group-hover:scale-105" />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-[15px] font-bold tracking-tight">
              <span className="text-gradient-brand">热点雷达</span>
            </span>
            <span className="mt-1 text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
              全网热点实时聚合
            </span>
          </span>
        </Link>

        {/* 桌面水平导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-primary" />
                )}
                {isActive && (
                  <span className="absolute inset-0 -z-10 rounded-lg bg-primary/8" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="刷新数据"
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/60',
                'text-muted-foreground transition-all duration-300 hover:border-primary/40 hover:text-primary',
                'active:scale-95 disabled:opacity-50',
              )}
            >
              <RefreshCw className={cn('h-[18px] w-[18px]', isRefreshing && 'animate-spin text-primary')} />
            </button>
          )}
          <ThemeToggle />

          {/* 移动端汉堡 */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="打开菜单"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary active:scale-95 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[82vw] max-w-xs p-0">
              <SheetHeader className="border-b px-5 pb-5 pt-6">
                <SheetTitle asChild>
                  <span className="flex items-center gap-2.5">
                    <Logo showText={false} size={34} />
                    <span className="text-gradient-brand text-base font-bold">热点雷达</span>
                  </span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 p-4">
                {NAV_ITEMS.map(({ href, label, icon: Icon, description }) => {
                  const isActive = pathname === href;
                  return (
                    <SheetClose asChild key={href}>
                      <Link
                        href={href}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-3 transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg',
                            isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex flex-col">
                          <span className="text-sm font-semibold">{label}</span>
                          <span className="text-xs text-muted-foreground">{description}</span>
                        </span>
                        <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground/50" />
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>

              <div className="absolute inset-x-0 bottom-0 border-t p-4 text-center">
                <p className="text-[11px] text-muted-foreground">实时聚合 · 跨平台去重 · 智能解读</p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
