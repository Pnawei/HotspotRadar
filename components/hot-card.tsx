'use client';

// 热点卡片：响应式网格中的统一卡片
// 排名 + 标题 + AI 摘要 + 分类/热度/来源

import Link from 'next/link';
import { Flame, Clock, Globe, ArrowUpRight } from 'lucide-react';
import type { HotEventListItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface HotCardProps {
  item: HotEventListItem;
  rank: number;
  index?: number;
}

export function HotCard({ item, rank, index = 0 }: HotCardProps) {
  const isHot = item.heat_score >= 80;
  const isTop3 = rank <= 3;

  const badgeClass =
    rank === 1
      ? 'rank-badge-gold'
      : rank === 2
        ? 'rank-badge-silver'
        : rank === 3
          ? 'rank-badge-bronze'
          : 'bg-secondary text-secondary-foreground';

  return (
    <Link
      href={`/detail/${item.id}`}
      className="premium-card card-hover group flex h-full flex-col p-5 animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 9) * 45}ms` }}
    >
      {/* 头部：排名 + 热度 */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold tabular-nums',
            badgeClass,
          )}
        >
          {rank}
        </span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      {/* 标题 */}
      <h3
        className={cn(
          'line-clamp-2 font-semibold leading-snug tracking-tight transition-colors',
          'text-[15px] group-hover:text-primary',
          isTop3 && 'text-base',
          item.titleZh ? 'mb-1' : 'mb-2',
        )}
      >
        {item.title}
      </h3>

      {/* 非中文标题的中文译文 */}
      {item.titleZh && (
        <p className="mb-2 line-clamp-1 text-xs leading-relaxed text-muted-foreground">
          <span className="mr-1 inline-flex items-center rounded bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            译
          </span>
          {item.titleZh}
        </p>
      )}

      {/* AI 摘要 */}
      {item.summary_one_line && (
        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.summary_one_line}
        </p>
      )}

      <div className="mt-auto space-y-3">
        {/* 热度条 */}
        <div className="heat-bar h-1.5 w-full bg-secondary">
          <div
            className={cn(
              'heat-bar-fill h-full rounded-full',
              isHot
                ? 'bg-gradient-to-r from-amber-500 to-red-500'
                : 'bg-gradient-to-r from-indigo-500 to-violet-500',
            )}
            style={{ width: `${Math.min(100, Math.max(4, item.heat_score))}%` }}
          />
        </div>

        {/* 元信息 */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="rounded-md bg-secondary/80 px-2 py-1 font-medium text-secondary-foreground">
            {item.category}
          </span>
          <span className="flex items-center gap-1">
            <Flame className={cn('h-3 w-3', isHot ? 'text-red-500' : 'text-amber-500')} />
            <span className="font-semibold tabular-nums">{item.heat_score.toFixed(0)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {item.source_count} 来源
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <Clock className="h-2.5 w-2.5" />
          <RelativeTime iso={item.updated_at} />
        </div>
      </div>
    </Link>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return <span>刚刚更新</span>;
  if (minutes < 60) return <span>{minutes} 分钟前更新</span>;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return <span>{hours} 小时前更新</span>;
  return <span>{new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} 更新</span>;
}
