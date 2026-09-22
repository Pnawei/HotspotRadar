'use client';

// 平台页：页头 + 概览统计 + 国内/国际分段切换 + 平台状态卡片网格

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { Clock, Layers, Globe, MapPin, Zap, Activity } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Skeleton } from '@/components/skeleton';
import { EmptyState } from '@/components/empty-state';
import { cn, API_BASE_URL } from '@/lib/utils';

interface PlatformStatus {
  id: string;
  name: string;
  icon: string;
  color: string;
  region: 'domestic' | 'international';
  status: 'online' | 'offline' | 'slow';
  crawlInterval: number;
  lastUpdate: string;
  itemCount: number;
  enabled: boolean;
}

interface ApiResponse {
  domesticPlatforms: PlatformStatus[];
  internationalPlatforms: PlatformStatus[];
  totalPlatforms: number;
  domesticCount: number;
  internationalCount: number;
  onlineCount: number;
}

const fetcher = async (url: string): Promise<ApiResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('数据获取失败');
  const json = await response.json();
  if (json.code !== 0) throw new Error(json.message || '服务返回异常');
  return json.data;
};

const formatTime = (dateStr?: string | null) => {
  if (!dateStr) return '暂无更新';
  const date = new Date(dateStr);
  const time = date.getTime();
  if (Number.isNaN(time)) return '暂无更新';
  const now = new Date();
  const diff = Math.max(0, now.getTime() - time);
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const STATUS_MAP = {
  online: {
    label: '在线',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  slow: {
    label: '缓慢',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  offline: {
    label: '离线',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
} as const;

function PlatformCard({ platform, index }: { platform: PlatformStatus; index: number }) {
  const status = STATUS_MAP[platform.status];

  return (
    <article
      className="premium-card card-hover group flex h-full flex-col p-5 animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 11) * 40}ms` }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${platform.color || '#6366f1'}, ${platform.color || '#8b5cf6'})`,
          }}
        >
          {platform.name[0]}
        </div>
        <span className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold', status.badge)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', status.dot, platform.status === 'online' && 'animate-pulse')} />
          {status.label}
        </span>
      </div>

      <h3 className="mb-1 text-sm font-bold tracking-tight">{platform.name}</h3>
      <p className="mb-4 text-[11px] text-muted-foreground">
        {platform.region === 'domestic' ? '国内平台' : '国际平台'}
      </p>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/70 pt-3 text-[11px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Layers className="h-3 w-3" />
          <span className="font-semibold tabular-nums text-foreground">{platform.itemCount}</span> 条
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatTime(platform.lastUpdate)}
        </span>
        <span className="col-span-2 flex items-center gap-1 text-muted-foreground">
          <Zap className="h-3 w-3" />
          常态更新中
        </span>
      </div>
    </article>
  );
}

export default function PlatformsPage() {
  const { data, error, isLoading, mutate } = useSWR(`${API_BASE_URL}/api/platforms`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60000,
    keepPreviousData: true,
  });

  const [activeTab, setActiveTab] = useState<'domestic' | 'international'>('domestic');

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const platforms = data
    ? activeTab === 'domestic'
      ? data.domesticPlatforms ?? []
      : data.internationalPlatforms ?? []
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar onRefresh={handleRefresh} isRefreshing={isLoading} />

      <main className="flex-1">
        {/* 页头 */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="bg-grid-pattern absolute inset-0" />
          <div
            className="pointer-events-none absolute -top-24 left-1/4 h-72 w-96 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--glow-2) 0%, transparent 70%)' }}
          />
          <div className="page-container relative py-12 lg:py-16">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              <Activity className="h-3 w-3" />
              数据源监测
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="text-gradient-brand">平台</span>数据源总览
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              查看全部平台的运行状态、热点数量与最近更新时间。
            </p>

            {/* 概览统计 */}
            {data && (
              <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                <OverviewStat icon={<Layers className="h-4 w-4 text-indigo-500" />} value={data.totalPlatforms} label="接入平台" />
                <OverviewStat icon={<Zap className="h-4 w-4 text-emerald-500" />} value={data.onlineCount} label="当前在线" />
                <OverviewStat icon={<MapPin className="h-4 w-4 text-amber-500" />} value={data.domesticCount} label="国内平台" />
                <OverviewStat icon={<Globe className="h-4 w-4 text-sky-500" />} value={data.internationalCount} label="国际平台" />
              </div>
            )}
          </div>
        </section>

        <section className="page-container py-8">
          {/* 分段控制器 */}
          <div className="mb-8 inline-flex w-full max-w-md items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm sm:w-auto">
            <TabButton
              active={activeTab === 'domestic'}
              onClick={() => setActiveTab('domestic')}
              icon={<MapPin className="h-4 w-4" />}
              label={`国内 (${data?.domesticCount ?? 0})`}
            />
            <TabButton
              active={activeTab === 'international'}
              onClick={() => setActiveTab('international')}
              icon={<Globe className="h-4 w-4" />}
              label={`国际 (${data?.internationalCount ?? 0})`}
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="premium-card p-5">
                  <div className="mb-4 flex justify-between">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-6 w-14 rounded-lg" />
                  </div>
                  <Skeleton className="mb-1 h-4 w-24" />
                  <Skeleton className="mb-4 h-3 w-16" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState type="error" action={{ label: '重试', onClick: handleRefresh }} />
          ) : !platforms.length ? (
            <EmptyState title="暂无平台" description="无法获取平台信息" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
              {platforms.map((platform, index) => (
                <PlatformCard key={platform.id} platform={platform} index={index} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function OverviewStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="premium-card flex items-center gap-3 p-3.5">
      {icon}
      <div>
        <div className="text-lg font-bold tabular-nums leading-tight">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300',
        'active:scale-95 sm:flex-none',
        active
          ? 'bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
