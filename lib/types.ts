// 热点列表项
export interface HotEventListItem {
  id: number;
  title: string;
  titleZh: string | null;
  category: string;
  heat_score: number;
  source_count: number;
  summary_one_line: string | null;
  first_seen_at: string;
  updated_at: string;
}

// 热点来源
export interface HotEventSource {
  platform: string;
  raw_title: string;
  raw_rank: number;
  raw_heat: string;
  source_url: string;
}

// 趋势点
export interface TrendPoint {
  sample_at: string;
  heat_score: number;
}

// AI 核查状态
export type VerificationStatus = 'verified' | 'unverified' | 'uncertain';

// DeepSeek 结构化扩充内容
export interface EventEnrichment {
  verified: VerificationStatus;
  summary: string;
  background: string;
  keyPoints: string[];
  impact: string;
  trend: string;
}

// 相关报道与讨论
export interface RelatedItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string | null;
  commentCount: number;
  diggCount: number;
  image: string | null;
}

// 相关热点（站内）
export interface RelatedEventItem {
  id: string;
  title: string;
  hotValue: string;
  categoryName: string;
}

// 热点详情
export interface HotEventDetail {
  id: number;
  title: string;
  titleZh: string | null;
  category: string;
  heat_score: number;
  source_count: number;
  summary_one_line: string | null;
  summary_short: string | null;
  first_seen_at: string;
  updated_at: string;
  sources: HotEventSource[];
  trend_points: TrendPoint[];
  aiEnrichment: EventEnrichment | null;
  aiGeneratedAt: string | null;
  relatedContent: RelatedItem[];
  relatedEvents: RelatedEventItem[];
}

// 热点趋势项
export interface HotTrendListItem {
  event_id: number;
  title: string;
  category: string;
  trend_points: TrendPoint[];
}
