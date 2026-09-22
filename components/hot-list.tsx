'use client';

// 首页：Hero 品牌区 + 数据统计 + 分类切换 + 响应式热点网格 + 分页

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { CategoryTabs } from './category-tabs';
import { HotCard } from './hot-card';
import { HotListSkeleton } from './skeleton';
import { EmptyState } from './empty-state';
import { ChevronLeft, ChevronRight, Flame, Layers, RefreshCw } from 'lucide-react';
import { API_BASE_URL, cn } from '@/lib/utils';
import type { HotEventListItem } from '@/lib/types';

const PAGE_SIZE = 24;

const categoryMap: Record<string, string> = {
  '全部': 'all',
  '社会': 'social',
  '娱乐': 'entertainment',
  '科技': 'technology',
  '财经': 'finance',
  '国际': 'international',
  '体育': 'sports',
};

const categories = ['全部', '社会', '娱乐', '科技', '财经', '国际', '体育'];

interface PaginatedResponse {
  items: HotEventListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface RawItem {
  id: string;
  title: string;
  titleZh: string | null;
  category: string;
  categoryName?: string;
  hotValueRaw: number;
  platformCount: number;
  aiSummary: string;
  createdAt: string;
  updatedAt?: string;
}

const fetcher = async (url: string): Promise<PaginatedResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('数据获取失败');
  const json = await response.json();
  if (json.code !== 0) throw new Error(json.message || '服务返回异常');

  const items: HotEventListItem[] = json.data.list.map((item: RawItem) => ({
    id: item.id,
    title: item.title,
    titleZh: item.titleZh ?? null,
    category: item.categoryName || item.category,
    heat_score: Math.min(100, item.hotValueRaw / 10000),
    source_count: item.platformCount,
    summary_one_line: item.aiSummary,
    first_seen_at: item.createdAt,
    updated_at: item.updatedAt || item.createdAt,
  }));

  return {
    items,
    total: json.data.total,
    page: json.data.page,
    pageSize: json.data.pageSize,
    hasMore: json.data.hasMore,
  };
};

// 生成带省略号的页码数组
function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

export function HotList() {
  const [category, setCategory] = useState('全部');
  const [page, setPage] = useState(1);

  const apiCategory = categoryMap[category] || 'all';

  const { data, error, isLoading, mutate } = useSWR(
    `${API_BASE_URL}/api/hot?category=${apiCategory}&page=${page}&pageSize=${PAGE_SIZE}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  // 注意：key 与平台页相同，fetcher 必须返回相同形状（data 载荷），否则跨页缓存会串形
  const { data: platformsData } = useSWR<{ onlineCount: number }>(
    `${API_BASE_URL}/api/platforms`,
    async (url: string) => {
      const res = await fetch(url);
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message || '服务返回异常');
      return json.data;
    },
  );

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const onlinePlatforms: number = platformsData?.onlineCount ?? 0;
  const lastUpdate = data?.items?.[0]?.updated_at;

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const handleCategoryChange = useCallback((newCategory: string) => {
    setCategory(newCategory);
    setPage(1);
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [totalPages],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar onRefresh={handleRefresh} isRefreshing={isLoading} />

      <main className="flex-1">
        {/* ============ Hero 品牌区 ============ */}
        <section className="relative overflow-hidden">
          <div className="bg-grid-pattern absolute inset-0" />
          <div
            className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--glow-1) 0%, transparent 70%)' }}
          />
          <div
            className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--glow-2) 0%, transparent 70%)' }}
          />

          <div className="page-container relative py-14 text-center sm:py-16 lg:py-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-xs font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              实时监测中 · 内容持续更新
            </span>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
              全网热点
              <span className="text-gradient-brand"> 一站洞悉</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              聚合微博、知乎、百度、哔哩哔哩等主流平台热搜，跨平台去重、智能分类，
              <br className="hidden sm:block" />
              人工智能秒级生成事件摘要，让信息获取更高效。
            </p>

            {/* 数据统计 */}
            <div className="premium-card mx-auto mt-10 grid max-w-2xl grid-cols-3 divide-x divide-border overflow-hidden">
              <Stat
                icon={<Flame className="h-4 w-4 text-amber-500" />}
                value={data ? data.total.toLocaleString() : '—'}
                label="在榜热点"
              />
              <Stat
                icon={<Layers className="h-4 w-4 text-indigo-500" />}
                value={onlinePlatforms ? String(onlinePlatforms) : '—'}
                label="在线平台"
              />
              <Stat
                icon={<RefreshCw className="h-4 w-4 text-emerald-500" />}
                value={lastUpdate ? formatShortTime(lastUpdate) : '—'}
                label="最近更新"
              />
            </div>
          </div>
        </section>

        {/* ============ 热榜区 ============ */}
        <section className="page-container">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">实时热搜榜</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                当前分类：{category}
                {data ? ` · 共 ${data.total} 条` : ''}
              </p>
            </div>
          </div>

          <CategoryTabs
            categories={categories}
            activeCategory={category}
            onCategoryChange={handleCategoryChange}
          />

          <div className="mt-6">
            {isLoading ? (
              <HotListSkeleton count={9} />
            ) : error ? (
              <EmptyState type="error" action={{ label: '重试', onClick: handleRefresh }} />
            ) : !data?.items.length ? (
              <EmptyState title="暂无热点" description={`“${category}”分类下暂无内容`} />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
                  {data.items.map((item, index) => (
                    <HotCard
                      key={item.id}
                      item={item}
                      rank={(page - 1) * PAGE_SIZE + index + 1}
                      index={index}
                    />
                  ))}
                </div>

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-1.5">
                    <PagerButton disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </PagerButton>

                    {buildPageNumbers(page, totalPages).map((p, i) =>
                      p === 'ellipsis' ? (
                        <span key={`e-${i}`} className="px-2 text-sm text-muted-foreground">
                          …
                        </span>
                      ) : (
                        <PagerButton
                          key={p}
                          active={p === page}
                          onClick={() => handlePageChange(p)}
                        >
                          {p}
                        </PagerButton>
                      ),
                    )}

                    <PagerButton
                      disabled={page >= totalPages}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </PagerButton>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-5 sm:py-6">
      {icon}
      <span className="text-lg font-bold tabular-nums tracking-tight sm:text-2xl">{value}</span>
      <span className="text-[11px] text-muted-foreground sm:text-xs">{label}</span>
    </div>
  );
}

function PagerButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-all duration-200',
        'border active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
