'use client';

// 骨架屏（与正式内容同构的网格布局）

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg bg-muted skeleton-shimmer', className)} />
  );
}

/* ---------- 首页热点网格 ---------- */
export function HotListSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="premium-card flex h-full flex-col p-5 animate-fade-in-up"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-4 h-4 w-3/4" />
          <Skeleton className="mb-4 h-3 w-full" />
          <div className="mt-auto space-y-3">
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-12 rounded-md" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- 详情页 ---------- */
export function DetailSkeleton() {
  return (
    <div className="space-y-6 py-6">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-4/5" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="premium-card p-4">
            <Skeleton className="mx-auto mb-2 h-5 w-5" />
            <Skeleton className="mx-auto mb-1 h-6 w-12" />
            <Skeleton className="mx-auto h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="premium-card space-y-3 p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="premium-card space-y-3 p-6 lg:col-span-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="premium-card space-y-3 p-6">
          <Skeleton className="h-5 w-20" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- 趋势页网格 ---------- */
export function TrendListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="premium-card flex h-full flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-4 h-4 w-2/3" />
          <Skeleton className="mt-auto h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
