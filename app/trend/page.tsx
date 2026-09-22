'use client';

// 趋势页：页头 + 飙升/下降/稳定分段切换 + 响应式趋势卡片网格

import { useState, useCallback, useId } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { TrendingUp, TrendingDown, Activity, Flame, ArrowUpRight } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { TrendListSkeleton } from '@/components/skeleton';
import { EmptyState } from '@/components/empty-state';
import { cn, API_BASE_URL } from '@/lib/utils';
import type { HotTrendListItem, TrendPoint } from '@/lib/types';

type TrendType = 'rising' | 'falling' | 'stable';

const trendTypes: { key: TrendType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'rising', label: '飙升榜', icon: TrendingUp },
  { key: 'falling', label: '下降榜', icon: TrendingDown },
  { key: 'stable', label: '稳定榜', icon: Activity },
];

const fetcher = async (url: string): Promise<HotTrendListItem[]> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('数据获取失败');
  const json = await response.json();
  if (json.code !== 0) throw new Error(json.message || '服务返回异常');

  return json.data.list.map((item: {
    id: string;
    title: string;
    category: string;
    categoryName?: string;
    miniTrendData: number[];
  }) => ({
    event_id: item.id,
    title: item.title,
    category: item.categoryName || item.category,
    trend_points: item.miniTrendData.map((value: number, index: number) => ({
      sample_at: `${index}:00`,
      heat_score: value,
    })) as TrendPoint[],
  }));
};

function calculateTrend(points: { heat_score: number }[]): { change: number; type: TrendType } {
  if (points.length < 2) return { change: 0, type: 'stable' };
  const recent = points.slice(-3);
  const earlier = points.slice(0, 3);
  const recentAvg = recent.reduce((sum, p) => sum + p.heat_score, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, p) => sum + p.heat_score, 0) / earlier.length;
  const change = recentAvg - earlierAvg;
  if (change > 5) return { change, type: 'rising' };
  if (change < -5) return { change, type: 'falling' };
  return { change, type: 'stable' };
}

export default function TrendPage() {
  const [trendType, setTrendType] = useState<TrendType>('rising');

  const { data, error, isLoading, mutate } = useSWR(
    `${API_BASE_URL}/api/trends?type=${trendType}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000, keepPreviousData: true },
  );

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar onRefresh={handleRefresh} isRefreshing={isLoading} />

      <main className="flex-1">
        {/* 页头 */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="bg-grid-pattern absolute inset-0" />
          <div
            className="pointer-events-none absolute -top-24 right-0 h-72 w-96 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--glow-1) 0%, transparent 70%)' }}
          />
          <div className="page-container relative py-12 lg:py-16">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              <Activity className="h-3 w-3" />
              趋势雷达
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              热度<span className="text-gradient-brand">趋势风向</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              基于近 8 个采样周期的热度变化，捕捉正在快速升温、退烧回落或保持稳定的事件。
            </p>
          </div>
        </section>

        <section className="page-container py-8">
          {/* 分段控制器 */}
          <div className="mb-8 inline-flex w-full max-w-md items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm sm:w-auto">
            {trendTypes.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTrendType(key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300',
                  'active:scale-95 sm:flex-none',
                  trendType === key
                    ? 'bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <TrendListSkeleton count={6} />
          ) : error ? (
            <EmptyState type="error" action={{ label: '重试', onClick: handleRefresh }} />
          ) : !data?.length ? (
            <EmptyState title="暂无数据" description="当前筛选条件下暂无趋势数据" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
              {data.map((item, index) => {
                const trend = calculateTrend(item.trend_points);
                const latestScore = item.trend_points[item.trend_points.length - 1]?.heat_score || 0;
                const series = item.trend_points.map((p) => p.heat_score);

                return (
                  <Link
                    key={item.event_id}
                    href={`/detail/${item.event_id}`}
                    className="premium-card card-hover group flex h-full flex-col p-5 animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(index, 9) * 45}ms` }}
                  >
                    {/* 头部 */}
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold tabular-nums text-secondary-foreground">
                        {index + 1}
                      </span>
                      <TrendTag type={trend.type} change={trend.change} />
                    </div>

                    {/* 标题 */}
                    <h3 className="mb-3 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>

                    {/* 迷你走势 */}
                    <Sparkline data={series} type={trend.type} />

                    {/* 底部元信息 */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="rounded-md bg-secondary/80 px-2 py-1 font-medium text-secondary-foreground">
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-amber-500" />
                        <span className="font-semibold tabular-nums">{latestScore.toFixed(0)}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-all group-hover:text-primary" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function TrendTag({ type, change }: { type: TrendType; change: number }) {
  const config = {
    rising: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', Icon: TrendingUp },
    falling: { cls: 'bg-red-500/10 text-red-600 dark:text-red-400', Icon: TrendingDown },
    stable: { cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', Icon: Activity },
  }[type];

  return (
    <span className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold', config.cls)}>
      <config.Icon className="h-3 w-3" />
      {change > 0 ? '+' : ''}{change.toFixed(0)}
    </span>
  );
}

// SVG 迷你走势曲线 + 渐变面积
function Sparkline({ data, type }: { data: number[]; type: TrendType }) {
  const gradientId = useId();
  const w = 120;
  const h = 44;
  const pad = 3;

  if (data.length < 2) return <div className="h-11" />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const coords = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${h} L${coords[0][0].toFixed(1)},${h} Z`;

  const stroke =
    type === 'rising' ? '#10b981' : type === 'falling' ? '#ef4444' : '#0ea5e9';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={coords[coords.length - 1][0]}
        cy={coords[coords.length - 1][1]}
        r="2.5"
        fill={stroke}
      />
    </svg>
  );
}
