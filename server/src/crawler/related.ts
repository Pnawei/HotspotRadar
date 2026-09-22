// 详情页相关内容服务：
// 1) 从头条搜索服务端渲染页解析结构化的相关报道/讨论（真实原文链接、摘要、媒体、时间、互动数）
// 2) 头条结果不足时，用必应中国搜索补充
// 3) 本地热点库按标题二元组重叠度推荐相关热点
// 设计原则：只取简短摘要并跳转原文（版权归原作者所有）；全部失败静默降级，绝不抛出

import { config } from '../config.js';
import { topEvents } from '../db/database.js';
import { getCategoryName } from '../constants.js';

const PC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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

export interface RelatedEventItem {
  id: string;
  title: string;
  hotValue: string;
  categoryName: string;
}

// ---------- 通用工具 ----------

function decodeEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&x27;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x3D;/g, '=')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ensp;/g, ' ')
    .replace(/&emsp;/g, ' ')
    .replace(/&#0?183;/g, '·')
    .replace(/&amp;/g, '&');
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('相关内容请求超时'));
    }, timeoutMs);

    fetch(url, {
      headers: {
        'User-Agent': PC_UA,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        clearTimeout(timer);
        if (!response.ok) {
          reject(new Error(`相关内容源返回 ${response.status}`));
          return;
        }
        resolve(await response.text());
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// ---------- 头条搜索（SSR 内嵌 JSON 卡片） ----------

interface ToutiaoRawItem {
  title?: unknown;
  abstract?: unknown;
  article_url?: unknown;
  share_url?: unknown;
  open_url?: unknown;
  source_url?: unknown;
  item_source_url?: unknown;
  source?: unknown;
  media_name?: unknown;
  datetime?: unknown;
  display_time?: unknown;
  publish_time?: unknown;
  comment_count?: unknown;
  digg_count?: unknown;
  image_url?: unknown;
  large_image_url?: unknown;
  middle_image_url?: unknown;
  image_list?: unknown;
}

async function fetchToutiaoRelated(query: string): Promise<RelatedItem[]> {
  const url = `https://so.toutiao.com/search?dvpf=pc&keyword=${encodeURIComponent(query)}`;
  const html = await fetchWithTimeout(url, config.relatedTimeoutMs);

  const cardRe =
    /<script[^>]*data-druid-card-data-id="[^"]*"[^>]*>([\s\S]*?)<\/script>/g;

  const rawItems: ToutiaoRawItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = cardRe.exec(html)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(decodeEntities(match[1]));
    } catch {
      continue;
    }
    collectRawItems(parsed, rawItems, 0);
  }

  const items: RelatedItem[] = [];
  const seen = new Set<string>();

  for (const raw of rawItems) {
    if (typeof raw.title !== 'string') continue;

    const resolvedUrl = resolveToutiaoUrl(raw);
    if (!resolvedUrl) continue;

    const title = stripTags(raw.title);
    const dedupeKey = title.replace(/[\s#【】\[\]《》「」『』，。、！？：；]/g, '');
    if (!title || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const abstract = typeof raw.abstract === 'string' ? stripTags(raw.abstract) : '';
    const publishedAt = resolveToutiaoTime(raw);

    items.push({
      title,
      summary: abstract ? truncate(abstract, 120) : title,
      url: resolvedUrl,
      source:
        (typeof raw.source === 'string' && raw.source) ||
        (typeof raw.media_name === 'string' && raw.media_name) ||
        hostOf(resolvedUrl) ||
        '今日头条',
      publishedAt,
      commentCount: toCount(raw.comment_count),
      diggCount: toCount(raw.digg_count),
      image: resolveToutiaoImage(raw),
    });
  }

  return items;
}

// 递归（限深）收集形如 { title, article_url... } 的结果节点
function collectRawItems(node: unknown, out: ToutiaoRawItem[], depth: number): void {
  if (!node || typeof node !== 'object' || depth > 6) return;

  const record = node as Record<string, unknown>;
  if (typeof record.title === 'string') {
    if (
      typeof record.article_url === 'string' ||
      typeof record.share_url === 'string' ||
      typeof record.open_url === 'string' ||
      typeof record.item_source_url === 'string'
    ) {
      out.push(record as unknown as ToutiaoRawItem);
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      collectRawItems(value, out, depth + 1);
    }
  }
}

// 已知失效或不稳定的链接模式（采集时直接跳过，避免给用户死链）
const DEAD_URL_PATTERNS = [
  /home\.xinhua-news\.com\/v\d+\/rss\/newsdetaillink/,
];

function isLiveUrl(url: string): boolean {
  return DEAD_URL_PATTERNS.every((pattern) => !pattern.test(url));
}

function resolveToutiaoUrl(raw: ToutiaoRawItem): string | null {
  const candidates = [raw.article_url, raw.share_url, raw.open_url, raw.source_url];
  for (const candidate of candidates) {
    if (
      typeof candidate === 'string' &&
      /^https?:\/\//.test(candidate) &&
      isLiveUrl(candidate)
    ) {
      return candidate;
    }
  }
  if (typeof raw.item_source_url === 'string') {
    const path = raw.item_source_url.startsWith('/')
      ? raw.item_source_url
      : `/${raw.item_source_url}`;
    const resolved = `https://www.toutiao.com${path}`;
    if (isLiveUrl(resolved)) return resolved;
  }
  return null;
}

function resolveToutiaoTime(raw: ToutiaoRawItem): string | null {
  if (typeof raw.datetime === 'string') {
    const iso = `${raw.datetime.replace(' ', 'T')}+08:00`;
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }
  const unix = [raw.display_time, raw.publish_time].find(
    (v): v is number => typeof v === 'number' && v > 0,
  );
  return unix ? new Date(unix * 1000).toISOString() : null;
}

function resolveToutiaoImage(raw: ToutiaoRawItem): string | null {
  const direct = [raw.large_image_url, raw.middle_image_url, raw.image_url].find(
    (v): v is string => typeof v === 'string' && /^https?:\/\//.test(v),
  );
  if (direct) return direct;
  if (Array.isArray(raw.image_list)) {
    const first = raw.image_list[0] as { url?: unknown } | undefined;
    if (first && typeof first.url === 'string') return first.url;
  }
  return null;
}

// ---------- 必应中国（兜底补充源） ----------

async function fetchBingRelated(query: string): Promise<RelatedItem[]> {
  const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}`;
  const html = await fetchWithTimeout(url, config.relatedTimeoutMs);

  const segments = html.split('<li class="b_algo"').slice(1);
  const items: RelatedItem[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    const block = segment.slice(0, 4000);

    const linkMatch = block.match(
      /<h2[^>]*>[\s\S]*?<a[^>]*href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/,
    );
    if (!linkMatch) continue;

    const itemUrl = decodeEntities(linkMatch[1]);
    const title = stripTags(linkMatch[2]);
    const dedupeKey = title.replace(/[\s#【】\[\]《》「」『』，。、！？：；]/g, '');
    if (!title || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const summary = snippetMatch ? stripTags(snippetMatch[1]) : title;

    items.push({
      title,
      summary: truncate(summary, 120),
      url: itemUrl,
      source: hostOf(itemUrl) || '必应搜索',
      publishedAt: null,
      commentCount: 0,
      diggCount: 0,
      image: null,
    });
  }

  return items;
}

// ---------- 聚合入口 ----------

export async function getRelatedContent(title: string): Promise<RelatedItem[]> {
  let items: RelatedItem[] = [];

  try {
    items = await fetchToutiaoRelated(title);
  } catch (error) {
    console.warn('[related] 头条搜索抓取失败:', (error as Error).message);
  }

  // 头条结果偏少（可能触发反爬或冷门话题），用必应补充
  if (items.length < 3) {
    try {
      const bingItems = await fetchBingRelated(title);
      const existing = new Set(items.map((i) => i.url));
      for (const item of bingItems) {
        if (!existing.has(item.url)) items.push(item);
      }
    } catch (error) {
      console.warn('[related] 必应搜索抓取失败:', (error as Error).message);
    }
  }

  return items.slice(0, 8);
}

// ---------- 本地相关热点 ----------

export function findRelatedEvents(
  selfId: string,
  title: string,
  limit = 5,
): RelatedEventItem[] {
  const selfBigrams = buildBigrams(title);
  if (selfBigrams.size === 0) return [];

  const scored: Array<{ score: number; event: (typeof candidates)[number] }> = [];

  for (const event of candidates) {
    if (event.event_id === selfId) continue;
    const other = buildBigrams(event.title);
    let score = 0;
    for (const gram of other) {
      // 过滤过于通用的二元组，降低噪声匹配
      if (selfBigrams.has(gram) && !GENERIC_BIGRAMS.has(gram)) score++;
    }
    if (score > 0) scored.push({ score, event });
  }

  return scored
    .sort((a, b) => b.score - a.score || b.event.hot_value - a.event.hot_value)
    .slice(0, limit)
    .map(({ event }) => ({
      id: event.event_id,
      title: event.title,
      hotValue: event.hot_display,
      categoryName: getCategoryName(event.category),
    }));
}

// 预取近期热点作为候选池（每次详情请求计算，300 条开销可忽略）
const candidates = topEvents(300);

// 过于通用的二元组（不参与相关度计算）
const GENERIC_BIGRAMS = new Set([
  '我国', '中国', '今日', '今天', '昨天', '网友', '全部', '已经',
  '一个', '什么', '怎么', '为何', '为什么', '最新', '曝光', '这个',
  '首次', '超过', '回应', '回应', '官方', '宣布', '发布', '视频',
]);

// 生成中文二元组；英文/数字单词整体作为一个词并补充二元组
function buildBigrams(text: string): Set<string> {
  const grams = new Set<string>();
  const runs = text.match(/[\u4e00-\u9fa5a-z0-9A-Z]+/g);
  if (!runs) return grams;

  for (const run of runs) {
    if (/^[a-z0-9A-Z]+$/.test(run)) {
      const word = run.toLowerCase();
      grams.add(word);
      for (let i = 0; i < word.length - 1; i++) {
        grams.add(word.slice(i, i + 2));
      }
    } else {
      for (let i = 0; i < run.length - 1; i++) {
        grams.add(run.slice(i, i + 2));
      }
    }
  }

  return grams;
}

// ---------- 小工具 ----------

function toCount(value: unknown): number {
  return typeof value === 'number' && value >= 0 ? value : 0;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
