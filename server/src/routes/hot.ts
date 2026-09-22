// 热点路由：GET /api/hot（列表）、GET /api/hot/:id（详情）

import { Router } from 'express';
import {
  listEvents,
  countEvents,
  getEvent,
  listSources,
  getRecentSamples,
  getSourceSummary,
  getRelatedCache,
  setRelatedCache,
} from '../db/database.js';
import { getCategoryName } from '../constants.js';
import { config } from '../config.js';
import {
  getRelatedContent,
  findRelatedEvents,
  type RelatedItem,
  type RelatedEventItem,
} from '../crawler/related.js';
import { enrichAndPersist, type EventEnrichment } from '../ai/enrichment.js';
import { detailedSummary } from '../ai/fallback.js';
import { ruleSummary } from '../ai/rule-summary.js';
import { translateMany, translateToZh } from '../ai/translate.js';
import { sendOk, sendError } from '../utils/http.js';

export const hotRouter = Router();

// 热点列表
hotRouter.get('/', async (req, res) => {
  try {
    const categoryParam = (req.query.category as string) || 'all';
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20),
    );

    const category = categoryParam === 'all' ? undefined : categoryParam;
    const total = countEvents(category);
    const rows = listEvents(category, pageSize, (page - 1) * pageSize);
    const sourceInfoMap = getSourceSummary(rows.map((r) => r.event_id));

    // 批量翻译非中文标题（命中缓存时极快，未命中走 AI）
    const titleZhList = await translateMany(rows.map((r) => r.title));

    const list = rows.map((row, index) => {
      const sourceInfo = sourceInfoMap.get(row.event_id);
      return {
        id: row.event_id,
        title: row.title,
        titleZh: titleZhList[index],
        hotValue: row.hot_display,
        hotValueRaw: row.hot_value,
        rank: row.rank,
        category: row.category,
        categoryName: getCategoryName(row.category),
        platforms: sourceInfo?.names ?? [],
        platformCount: sourceInfo?.count ?? 0,
        aiSummary: row.excerpt || ruleSummary(row.title),
        createdAt: row.first_seen_at,
        updatedAt: row.updated_at,
      };
    });

    const end = (page - 1) * pageSize + pageSize;

    return sendOk(res, {
      list,
      total,
      page,
      pageSize,
      hasMore: end < total,
    });
  } catch (error) {
    console.error('[routes] 获取热点列表失败:', error);
    return sendError(res, 500, '服务器内部错误');
  }
});

// 热点详情
hotRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = getEvent(id);

    if (!event) {
      return sendError(res, 404, '热点不存在');
    }

    const sources = listSources(id);

    // 趋势数据：优先取真实采样，不足时生成模拟数据
    const samples = getRecentSamples(id, 24);
    const trendData =
      samples.length > 0
        ? samples.map((s) => ({ time: s.sample_at, value: s.heat_score }))
        : generateSyntheticTrend();

    // AI 扩充内容：优先读缓存（每事件只计费一次），无缓存时实时生成并回写
    let aiEnrichment: EventEnrichment | null = null;

    if (event.ai_detail) {
      try {
        aiEnrichment = JSON.parse(event.ai_detail) as EventEnrichment;
      } catch {
        aiEnrichment = null;
      }
    } else {
      try {
        aiEnrichment = await enrichAndPersist({
          event_id: id,
          title: event.title,
          category: event.category,
        });
      } catch {
        aiEnrichment = null;
      }
    }

    // 摘要：取扩充内容概述，失败再走规则降级
    const aiSummary = aiEnrichment?.summary || detailedSummary(event.title);

    // 非中文标题翻译（命中缓存极快）
    const titleZh = await translateToZh(event.title);

    // 相关报道与讨论：缓存有效期内直接复用；过期则重新抓取，失败时回退旧缓存
    let cachedItems: RelatedItem[] | null = null;
    let cacheFresh = false;
    const cached = getRelatedCache(id);
    if (cached) {
      try {
        cachedItems = JSON.parse(cached.payload) as RelatedItem[];
        cacheFresh =
          Date.now() - new Date(cached.updated_at).getTime() < config.relatedTtlMs;
      } catch {
        cachedItems = null;
      }
    }

    let relatedContent: RelatedItem[];
    if (cacheFresh && cachedItems) {
      relatedContent = cachedItems;
    } else {
      const fresh = await getRelatedContent(event.title);
      if (fresh.length > 0) {
        relatedContent = fresh;
        setRelatedCache(id, JSON.stringify(fresh), new Date().toISOString());
      } else {
        relatedContent = cachedItems ?? [];
      }
    }

    // 本地相关热点
    const relatedEvents: RelatedEventItem[] = findRelatedEvents(id, event.title, 5);

    return sendOk(res, {
      id: event.event_id,
      title: event.title,
      titleZh,
      hotValue: event.hot_display,
      hotValueRaw: event.hot_value,
      rank: event.rank,
      category: event.category,
      categoryName: getCategoryName(event.category),
      aiSummary,
      aiEnrichment,
      aiVerified: event.ai_verified,
      aiGeneratedAt: event.ai_generated_at,
      sources: sources.map((s) => ({
        platform: s.platform,
        platformName: s.platform_name,
        url: s.url,
        hotValue: s.hot_value,
      })),
      trendData,
      relatedContent,
      relatedEvents,
      createdAt: event.first_seen_at,
      updatedAt: event.updated_at,
    });
  } catch (error) {
    console.error('[routes] 获取热点详情失败:', error);
    return sendError(res, 500, '服务器内部错误');
  }
});

// 生成 24 小时模拟趋势（ISO 时间戳，保证图表可解析）
function generateSyntheticTrend(): Array<{ time: string; value: number }> {
  const now = Date.now();
  const baseValue = Math.floor(Math.random() * 500000) + 100000;
  const data: Array<{ time: string; value: number }> = [];

  for (let i = 23; i >= 0; i--) {
    const variance = Math.random() * 0.4 - 0.2; // -20% ~ +20%
    const value = Math.floor(baseValue * (1 + variance) * (1 + (23 - i) * 0.02));
    data.push({ time: new Date(now - i * 60 * 60 * 1000).toISOString(), value });
  }

  return data;
}
