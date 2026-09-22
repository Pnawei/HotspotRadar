// 趋势路由：GET /api/trends?type=rising|falling|stable
// 趋势根据真实趋势采样计算（最近采样与最早采样的热度变化百分比）

import { Router } from 'express';
import { topEvents, getRecentSamples, getSourceSummary } from '../db/database.js';
import { getCategoryName } from '../constants.js';
import { sendOk, sendError } from '../utils/http.js';

export const trendsRouter = Router();

interface TrendItem {
  id: string;
  title: string;
  hotValue: string;
  hotValueRaw: number;
  rank: number;
  category: string;
  categoryName: string;
  platforms: string[];
  platformCount: number;
  change: number;
  changePercent: string;
  pct: number;
  trend: 'rising' | 'falling' | 'stable';
  miniTrendData: number[];
}

trendsRouter.get('/', (req, res) => {
  try {
    const type = (req.query.type as string) || 'rising';
    const events = topEvents(30);
    const sourceInfoMap = getSourceSummary(events.map((e) => e.event_id));

    const items: TrendItem[] = events.map((event) => {
      let scores = getRecentSamples(event.event_id, 8).map((s) => s.heat_score);
      if (scores.length === 0) {
        scores = [event.hot_value];
      }

      const latest = scores[scores.length - 1];
      const earlier = scores[0];
      const pct = earlier > 0 ? ((latest - earlier) / earlier) * 100 : 0;
      const trend: TrendItem['trend'] = pct > 5 ? 'rising' : pct < -5 ? 'falling' : 'stable';

      // 0-100 的迷你趋势，不足 8 点在前面补齐
      let mini = scores.map((v) => Math.min(100, Math.round(v / 10000)));
      if (mini.length < 8) {
        mini = [...Array(8 - mini.length).fill(mini[0]), ...mini];
      }

      const sourceInfo = sourceInfoMap.get(event.event_id);

      return {
        id: event.event_id,
        title: event.title,
        hotValue: event.hot_display,
        hotValueRaw: event.hot_value,
        rank: event.rank,
        category: event.category,
        categoryName: getCategoryName(event.category),
        platforms: sourceInfo?.names ?? [],
        platformCount: sourceInfo?.count ?? 0,
        change: latest - earlier,
        changePercent: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        pct,
        trend,
        miniTrendData: mini,
      };
    });

    let filtered: TrendItem[];
    switch (type) {
      case 'rising':
        filtered = items.filter((i) => i.trend === 'rising').sort((a, b) => b.pct - a.pct);
        break;
      case 'falling':
        filtered = items.filter((i) => i.trend === 'falling').sort((a, b) => a.pct - b.pct);
        break;
      case 'stable':
        filtered = items
          .filter((i) => i.trend === 'stable')
          .sort((a, b) => b.hotValueRaw - a.hotValueRaw);
        break;
      default:
        filtered = items;
    }

    return sendOk(res, {
      list: filtered.slice(0, 20),
      type,
      total: filtered.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[routes] 获取趋势失败:', error);
    return sendError(res, 500, '服务器内部错误');
  }
});
