'use client';

// 详情页：宽容器
// 顶部标题区 + 四项统计 + 两栏（趋势图/人工智能 分析 · 来源平台）

import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft,
  Flame,
  Clock,
  ExternalLink,
  TrendingUp,
  Globe,
  Sparkles,
  BadgeCheck,
  ShieldX,
  ShieldQuestion,
  ListChecks,
  FileText,
  Newspaper,
  MessageSquare,
  ThumbsUp,
  ChevronRight,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { TrendChart } from '@/components/trend-chart';
import { DetailSkeleton } from '@/components/skeleton';
import { EmptyState } from '@/components/empty-state';
import { API_BASE_URL, cn } from '@/lib/utils';
import type {
  HotEventDetail,
  TrendPoint,
  HotEventSource,
  VerificationStatus,
  EventEnrichment,
  RelatedItem,
  RelatedEventItem,
} from '@/lib/types';

const categoryNameMap: Record<string, string> = {
  social: '社会',
  entertainment: '娱乐',
  technology: '科技',
  finance: '财经',
  international: '国际',
  sports: '体育',
};

const fetcher = async (url: string): Promise<HotEventDetail | null> => {
  const response = await fetch(url);
  if (!response.ok) return null;
  const json = await response.json();
  if (json.code !== 0 || !json.data) return null;

  const data = json.data;
  return {
    id: data.id,
    title: data.title,
    titleZh: data.titleZh ?? null,
    category: data.categoryName || categoryNameMap[data.category] || '综合',
    heat_score: Math.min(100, data.hotValueRaw / 10000),
    source_count: data.sources?.length || 0,
    summary_one_line: data.aiSummary,
    summary_short: data.aiSummary,
    first_seen_at: data.createdAt,
    updated_at: data.updatedAt,
    sources: (data.sources || []).map(
      (s: { platform: string; platformName: string; title: string | null; url: string; hotValue: number }) =>
        ({
          platform: s.platformName,
          raw_title: s.title || data.title,
          raw_rank: 1,
          raw_heat: s.hotValue.toString(),
          source_url: s.url,
        }) as HotEventSource,
    ),
    trend_points: (data.trendData || []).map((t: { time: string; value: number }) => ({
      sample_at: t.time,
      heat_score: t.value / 10000,
    })) as TrendPoint[],
    aiEnrichment: data.aiEnrichment ?? null,
    aiGeneratedAt: data.aiGeneratedAt ?? null,
    relatedContent: Array.isArray(data.relatedContent)
      ? (data.relatedContent as RelatedItem[]).map((item) => ({
          title: String(item.title ?? ''),
          summary: String(item.summary ?? ''),
          url: String(item.url ?? ''),
          source: String(item.source ?? ''),
          publishedAt: item.publishedAt ?? null,
          commentCount: Number(item.commentCount) || 0,
          diggCount: Number(item.diggCount) || 0,
          image: item.image ?? null,
        }))
      : [],
    relatedEvents: Array.isArray(data.relatedEvents)
      ? (data.relatedEvents as RelatedEventItem[]).map((item) => ({
          id: String(item.id ?? ''),
          title: String(item.title ?? ''),
          hotValue: String(item.hotValue ?? ''),
          categoryName: String(item.categoryName ?? ''),
        }))
      : [],
  };
};

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DetailPage({ params }: DetailPageProps) {
  const resolvedParams = use(params);

  const { data, error, isLoading } = useSWR(
    `${API_BASE_URL}/api/hot/${resolvedParams.id}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120000 },
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="page-container-narrow flex-1">
          <DetailSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <EmptyState
            type="error"
            title="加载失败"
            description="无法获取热点详情"
            action={{
              label: '返回首页',
              onClick: () => {
                window.location.href = '/';
              },
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  const changePercent =
    data.trend_points.length > 1
      ? ((data.trend_points[data.trend_points.length - 1].heat_score -
          data.trend_points[0].heat_score) /
          Math.max(1, data.trend_points[0].heat_score)) *
        100
      : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* ============ 标题区 ============ */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="bg-grid-pattern absolute inset-0" />
          <div
            className="pointer-events-none absolute -top-24 left-1/3 h-64 w-96 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--glow-1) 0%, transparent 70%)' }}
          />
          <div className="page-container relative py-10 lg:py-14">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回热榜
            </Link>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {data.category}
              </span>
              {data.aiEnrichment && <VerificationBadge status={data.aiEnrichment.verified} />}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTime(data.first_seen_at)} 上榜
              </span>
            </div>

            <h1 className="max-w-4xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {data.title}
            </h1>

            {/* 非中文标题的中文译文 */}
            {data.titleZh && (
              <p className="mt-3 flex max-w-4xl items-start gap-2 text-base text-muted-foreground sm:text-lg">
                <span className="mt-0.5 inline-flex shrink-0 items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  中文译文
                </span>
                <span className="leading-relaxed">{data.titleZh}</span>
              </p>
            )}

            {/* 统计卡 */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={<Flame className="h-4 w-4 text-amber-500" />}
                value={data.heat_score.toFixed(0)}
                label="热度指数"
              />
              <StatCard
                icon={<Globe className="h-4 w-4 text-indigo-500" />}
                value={String(data.source_count)}
                label="覆盖平台"
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                value={`${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(0)}%`}
                label="区间涨幅"
              />
              <StatCard
                icon={<Clock className="h-4 w-4 text-sky-500" />}
                value={formatTime(data.updated_at).split(' ').slice(-1)[0] || '—'}
                label="最近更新"
              />
            </div>
          </div>
        </section>

        {/* ============ 两栏内容 ============ */}
        <section className="page-container py-8 lg:py-10">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* 左栏 */}
            <div className="space-y-6 lg:col-span-2">
              {data.trend_points.length > 0 && (
                <div className="premium-card p-6">
                  <h3 className="mb-5 flex items-center gap-2 text-base font-bold tracking-tight">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    热度趋势
                  </h3>
                  <TrendChart data={data.trend_points} height={240} />
                </div>
              )}

              {data.relatedContent.length > 0 && (
                <RelatedContentSection items={data.relatedContent} />
              )}

              {data.aiEnrichment ? (
                <EnrichmentSection enrichment={data.aiEnrichment} generatedAt={data.aiGeneratedAt} />
              ) : (
                data.summary_short && (
                  <div className="premium-card p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      人工智能事件解读
                    </h3>
                    <p className="text-sm leading-7 text-muted-foreground">{data.summary_short}</p>
                  </div>
                )
              )}
            </div>

            {/* 右栏：来源平台 + 相关热点 */}
            {(data.sources.length > 0 || data.relatedEvents.length > 0) && (
              <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                {data.sources.length > 0 && (
                <div className="premium-card overflow-hidden">
                  <div className="border-b border-border/70 px-5 py-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
                      <Globe className="h-4 w-4 text-primary" />
                      来源平台
                      <span className="ml-auto rounded-md bg-secondary px-2 py-0.5 text-xs font-bold tabular-nums text-secondary-foreground">
                        {data.sources.length}
                      </span>
                    </h3>
                  </div>
                  <div className="divide-y divide-border/70">
                    {data.sources.map((source, index) => (
                      <a
                        key={index}
                        href={source.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/source flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/60"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                          {source.platform[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{source.platform}</div>
                          <div className="text-xs text-muted-foreground">
                            热度 {parseInt(source.raw_heat).toLocaleString()}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover/source:text-primary" />
                      </a>
                    ))}
                  </div>
                </div>
                )}

                {data.relatedEvents.length > 0 && (
                  <RelatedEventsCard items={data.relatedEvents} />
                )}
              </aside>
            )}
          </div>

          {/* 内容合规说明 */}
          <div className="mt-8 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3">
            <p className="text-[11px] leading-6 text-muted-foreground">
              内容说明：本页仅聚合公开热榜标题，并由人工智能自动生成简短解读，不转载原文全文；页面所涉内容与标识的版权均归原平台及作者所有。人工智能
              解读可能存在偏差，仅供参考，请以来源平台原文及权威信源为准。如认为本页内容侵权或失实，请查看
              <Link
                href="/compliance"
                className="mx-1 font-medium text-primary underline-offset-2 hover:underline"
              >
                《内容合规与版权声明》
              </Link>
              并联系管理员，我们将在核实后及时删除或更正。
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// 时间格式化（模块级，主组件与各子区块共用）
function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="premium-card flex items-center gap-3 p-4">
      <span className="hidden sm:block">{icon}</span>
      <div>
        <div className="text-lg font-bold tabular-nums leading-tight">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>  );
}

// ---------- 人工智能 核查徽章 ----------

function VerificationBadge({ status }: { status: VerificationStatus }) {
  const config2 = {
    verified: {
      cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      Icon: BadgeCheck,
      label: '已核查属实',
    },
    unverified: {
      cls: 'bg-red-500/10 text-red-600 dark:text-red-400',
      Icon: ShieldX,
      label: '存疑/不实',
    },
    uncertain: {
      cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      Icon: ShieldQuestion,
      label: '待核实',
    },
  }[status];

  return (
    <span className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold', config2.cls)}>
      <config2.Icon className="h-3 w-3" />
      {config2.label}
    </span>
  );
}

// ---------- 结构化扩充内容 ----------

function EnrichmentSection({
  enrichment,
  generatedAt,
}: {
  enrichment: EventEnrichment;
  generatedAt: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* 事件概述 */}
      <div className="premium-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
          <Sparkles className="h-4 w-4 text-amber-500" />
          人工智能核查与概述
        </h3>
        {enrichment.summary ? (
          <p className="text-sm leading-7 text-muted-foreground">{enrichment.summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">暂无可展示的概述。</p>
        )}
        {generatedAt && (
          <p className="mt-4 text-[11px] text-muted-foreground/70">
            人工智能生成于 {formatTime(generatedAt)} · 内容仅供参考，请以权威信源为准
          </p>
        )}
      </div>

      {/* 核心要点 */}
      {enrichment.keyPoints.length > 0 && (
        <div className="premium-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
            <ListChecks className="h-4 w-4 text-primary" />
            核心要点
          </h3>
          <ul className="space-y-3">
            {enrichment.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
                  {i + 1}
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 事件背景 */}
      {enrichment.background && (
        <div className="premium-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
            <FileText className="h-4 w-4 text-indigo-500" />
            事件背景
          </h3>
          <p className="text-sm leading-7 text-muted-foreground">{enrichment.background}</p>
        </div>
      )}

      {/* 影响与趋势 */}
      {(enrichment.impact || enrichment.trend) && (
        <div className="premium-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold tracking-tight">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            影响与走向
          </h3>
          <div className="space-y-4">
            {enrichment.impact && (
              <div>
                <p className="mb-1 text-xs font-semibold text-foreground/80">舆情与影响</p>
                <p className="text-sm leading-7 text-muted-foreground">{enrichment.impact}</p>
              </div>
            )}
            {enrichment.trend && (
              <div>
                <p className="mb-1 text-xs font-semibold text-foreground/80">发展预判</p>
                <p className="text-sm leading-7 text-muted-foreground">{enrichment.trend}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- 相关报道与热议 ----------

function RelatedContentSection({ items }: { items: RelatedItem[] }) {
  const [lead, ...rest] = items;

  return (
    <div className="premium-card overflow-hidden">
      {/* 头部 */}
      <div className="border-b border-border/70 px-6 py-4">
        <h3 className="flex items-center gap-2 text-base font-bold tracking-tight">
          <Newspaper className="h-4 w-4 text-primary" />
          相关报道与热议
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          聚合全网媒体与网友对该事件的相关报道、解读和讨论
        </p>
      </div>

      {/* 头条报道（主要内容） */}
      <a
        href={lead.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block border-b border-border/70 bg-gradient-to-br from-primary/5 to-transparent px-6 py-5 transition-colors hover:bg-primary/5"
      >
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
            {lead.source}
          </span>
          {lead.publishedAt && <span>{formatTime(lead.publishedAt)}</span>}
        </div>
        <h4 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight transition-colors group-hover:text-primary">
          {lead.title}
        </h4>
        {lead.summary && lead.summary !== lead.title && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {lead.summary}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
          查看原文
          <ExternalLink className="h-3 w-3" />
        </span>
      </a>

      {/* 其余报道与讨论 */}
      {rest.length > 0 && (
        <div className="divide-y divide-border/70">
          {rest.map((item) => (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/70">{item.source}</span>
                  {item.publishedAt && (
                    <>
                      <span>·</span>
                      <span>{formatTime(item.publishedAt)}</span>
                    </>
                  )}
                </div>
                <h4 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                  {item.title}
                </h4>
                {item.summary && item.summary !== item.title && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {item.summary}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground/80">
                  {item.commentCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {item.commentCount} 评论
                    </span>
                  )}
                  {item.diggCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {item.diggCount} 点赞
                    </span>
                  )}
                  <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
              {/* 配图：外部图片直接引用，仅桌面端展示 */}
              {item.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className="hidden h-[72px] w-28 flex-shrink-0 rounded-lg object-cover sm:block"
                />
              )}
            </a>
          ))}
        </div>
      )}

      {/* 版权脚注 */}
      <div className="bg-muted/30 px-6 py-3">
        <p className="text-[11px] leading-5 text-muted-foreground">
          以上为公开搜索结果的标题与简短摘要，点击可跳转至原文阅读；内容版权归原作者及发布平台所有。如有侵权，请联系我们删除。
        </p>
      </div>
    </div>
  );
}

// ---------- 相关热点（站内推荐） ----------

function RelatedEventsCard({ items }: { items: RelatedEventItem[] }) {
  return (
    <div className="premium-card overflow-hidden">
      <div className="border-b border-border/70 px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <Flame className="h-4 w-4 text-amber-500" />
          相关热点
        </h3>
      </div>
      <div className="divide-y divide-border/70">
        {items.map((item, index) => (
          <Link
            key={item.id}
            href={`/detail/${item.id}`}
            className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/60"
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-muted text-[11px] font-bold tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium transition-colors group-hover:text-primary">
                {item.title}
              </span>
              <span className="text-[11px] text-muted-foreground">{item.categoryName}</span>
            </span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}
