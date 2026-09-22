// 爬虫聚合服务：并行抓取多平台热搜 -> 跨平台去重合并 -> 持久化到 SQLite

import { fetchWeiboHot, fetchWeiboHotFallback, type WeiboHotItem } from './weibo.js';
import { fetchZhihuHot, type ZhihuHotItem } from './zhihu.js';
import { fetchBaiduHot, type BaiduHotItem } from './baidu.js';
import { fetchBilibiliHot, type BilibiliHotItem } from './bilibili.js';
import { fetchDouyinHot, type DouyinHotItem } from './douyin.js';
import { fetchToutiaoHot, type ToutiaoHotItem } from './toutiao.js';
import { fetchDoubanHot, type DoubanHotItem } from './douban.js';
import { fetchHackerNewsHot, type HackerNewsHotItem } from './hackernews.js';
import { fetchGithubHot, type GithubHotItem } from './github.js';
import { fetchRedditHot, type RedditHotItem } from './reddit.js';
import { fetchGoogleTrendsHot, type GoogleTrendsHotItem } from './googletrends.js';
import { formatHotValue } from './utils.js';
import { generateFallbackData, shouldUseFallback } from './fallback-data.js';
import {
  db,
  upsertEvent,
  replaceSources,
  insertTrendSample,
  pruneTrendSamples,
  upsertCrawlLog,
  allCrawlLogs,
} from '../db/database.js';
import { config } from '../config.js';

// 统一的热点数据类型
export interface HotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  hotValueFormatted: string;
  category: string;
  platform: string;
  platformName: string;
  rank: number;
  excerpt?: string;
  tag?: string;
  sources: Array<{
    platform: string;
    platformName: string;
    url: string;
    title: string;
    hotValue: number;
  }>;
}

// 平台配置（图标、颜色、区域、默认爬取间隔）
export interface PlatformConfig {
  name: string;
  icon: string;
  color: string;
  region: 'domestic' | 'international';
  defaultInterval: number; // 秒
  enabled: boolean;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  // 国内平台
  weibo: { name: '微博', icon: '/icons/weibo.jpg', color: '#FF8200', region: 'domestic', defaultInterval: 300, enabled: true },
  zhihu: { name: '知乎', icon: '/icons/zhihu.jpg', color: '#0084FF', region: 'domestic', defaultInterval: 300, enabled: true },
  baidu: { name: '百度', icon: '/icons/baidu.jpg', color: '#2932E1', region: 'domestic', defaultInterval: 300, enabled: true },
  bilibili: { name: 'B站', icon: '/icons/bilibili.jpg', color: '#FB7299', region: 'domestic', defaultInterval: 300, enabled: true },
  douyin: { name: '抖音', icon: '/icons/douyin.jpg', color: '#000000', region: 'domestic', defaultInterval: 300, enabled: true },
  toutiao: { name: '今日头条', icon: '/icons/toutiao.jpg', color: '#F04142', region: 'domestic', defaultInterval: 300, enabled: true },
  xiaohongshu: { name: '小红书', icon: '/icons/xiaohongshu.jpg', color: '#FE2C55', region: 'domestic', defaultInterval: 600, enabled: true },
  douban: { name: '豆瓣', icon: '/icons/douban.jpg', color: '#00B51D', region: 'domestic', defaultInterval: 600, enabled: true },
  wechat: { name: '微信', icon: '/icons/wechat.jpg', color: '#07C160', region: 'domestic', defaultInterval: 600, enabled: true },
  // 国际平台（名称全部使用中文译名；GitHub 为无通用中文译名的品牌名，保留原拼写）
  twitter: { name: '推特', icon: '/icons/twitter.jpg', color: '#000000', region: 'international', defaultInterval: 300, enabled: true },
  reddit: { name: '红迪热帖', icon: '/icons/reddit.jpg', color: '#FF4500', region: 'international', defaultInterval: 300, enabled: true },
  github: { name: 'GitHub 热门', icon: '/icons/github.jpg', color: '#24292F', region: 'international', defaultInterval: 1800, enabled: true },
  youtube: { name: '优兔视频', icon: '/icons/youtube.jpg', color: '#FF0000', region: 'international', defaultInterval: 600, enabled: true },
  google: { name: '谷歌趋势', icon: '/icons/google.jpg', color: '#4285F4', region: 'international', defaultInterval: 600, enabled: true },
  hackernews: { name: '黑客新闻', icon: '/icons/hackernews.jpg', color: '#FF6600', region: 'international', defaultInterval: 600, enabled: true },
  producthunt: { name: '产品猎手', icon: '/icons/producthunt.jpg', color: '#DA552F', region: 'international', defaultInterval: 1800, enabled: true },
};

// 平台状态
export interface PlatformStatus {
  platform: string;
  platformName: string;
  icon: string;
  color: string;
  region: 'domestic' | 'international';
  status: 'online' | 'slow' | 'offline';
  lastUpdate: string;
  itemCount: number;
  responseTime: number;
  defaultInterval: number;
  enabled: boolean;
}

type AnyPlatformItem =
  | WeiboHotItem
  | ZhihuHotItem
  | BaiduHotItem
  | BilibiliHotItem
  | DouyinHotItem
  | ToutiaoHotItem
  | DoubanHotItem
  | HackerNewsHotItem
  | GithubHotItem
  | RedditHotItem
  | GoogleTrendsHotItem;

// 执行一次全站爬取并持久化
export async function crawlAndPersist(): Promise<{
  items: HotItem[];
  platforms: PlatformStatus[];
  updatedAt: string;
}> {
  const platformResults = new Map<string, { items: AnyPlatformItem[]; time: number }>();

  const fetchTasks: Array<{ key: string; fn: () => Promise<{ items: AnyPlatformItem[]; time: number }> }> = [
    {
      key: 'weibo',
      fn: async () => {
        const start = Date.now();
        // PC 侧边栏接口当前最稳定（移动端 API 固定 432 风控），作为主路
        let items = await fetchWeiboHotFallback();
        if (items.length === 0) {
          items = await fetchWeiboHot();
        }
        return { items, time: Date.now() - start };
      },
    },
    {
      key: 'zhihu',
      fn: async () => {
        const start = Date.now();
        const items = await fetchZhihuHot();
        return { items, time: Date.now() - start };
      },
    },
    {
      key: 'baidu',
      fn: async () => {
        const start = Date.now();
        const items = await fetchBaiduHot();
        return { items, time: Date.now() - start };
      },
    },
    {
      key: 'bilibili',
      fn: async () => {
        const start = Date.now();
        const items = await fetchBilibiliHot();
        return { items, time: Date.now() - start };
      },
    },
    {
      key: 'douyin',
      fn: async () => {
        const start = Date.now();
        const items = await fetchDouyinHot();
        return { items, time: Date.now() - start };
      },
    },
    {
      key: 'toutiao',
      fn: async () => {
        const start = Date.now();
        const items = await fetchToutiaoHot();
        return { items, time: Date.now() - start };
      },
    },
    {
      key: 'douban',
      fn: async () => {
        const start = Date.now();
        const items = await fetchDoubanHot();
        return { items, time: Date.now() - start };
      },
    },
    {
      key: 'hackernews',
      fn: async () => {
        const start = Date.now();
        const items = await fetchHackerNewsHot();
        return { items, time: Date.now() - start };
      },
    },
    {
      key: 'github',
      fn: async () => {
        const start = Date.now();
        const items = await fetchGithubHot();
        return { items, time: Date.now() - start };
      },
    },
    {
      key: 'reddit',
      fn: async () => {
        const start = Date.now();
        const items = await fetchRedditHot();
        return { items, time: Date.now() - start };
      },
    },
    {
      key: 'google',
      fn: async () => {
        const start = Date.now();
        const items = await fetchGoogleTrendsHot();
        return { items, time: Date.now() - start };
      },
    },
  ];

  const results = await Promise.allSettled(fetchTasks.map((task) => task.fn()));

  results.forEach((result, index) => {
    const key = fetchTasks[index].key;
    if (result.status === 'fulfilled') {
      platformResults.set(key, result.value);
    } else {
      platformResults.set(key, { items: [], time: 0 });
    }
  });

  // 即时补测：首轮 0 条的平台（网络瞬态波动时常见）立即重试一次，不必等下一个周期。
  // 知乎无 Cookie 时固定失败，跳过避免无效请求
  const emptyTasks = fetchTasks.filter((task) => {
    if (task.key === 'zhihu' && !config.zhihuCookie) return false;
    const current = platformResults.get(task.key);
    return !current || current.items.length === 0;
  });

  if (emptyTasks.length > 0) {
    const retries = await Promise.allSettled(emptyTasks.map((task) => task.fn()));
    retries.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.items.length > 0) {
        platformResults.set(emptyTasks[index].key, result.value);
      }
    });
  }

  // 跨平台合并与去重
  const titleMap = new Map<string, HotItem>();

  for (const [platform, { items }] of platformResults) {
    const platformInfo = PLATFORMS[platform];

    for (const item of items) {
      const normalizedTitle = normalizeTitle(item.title);
      const existing = findSimilarTitle(titleMap, normalizedTitle);

      if (existing) {
        existing.sources.push({
          platform: item.platform,
          platformName: platformInfo.name,
          url: item.url,
          title: item.title,
          hotValue: item.hotValue,
        });
        if (item.hotValue > existing.hotValue) {
          existing.hotValue = item.hotValue;
          existing.hotValueFormatted = formatHotValue(item.hotValue);
        }
      } else {
        const newItem: HotItem = {
          id: item.id,
          title: item.title,
          url: item.url,
          hotValue: item.hotValue,
          hotValueFormatted: formatHotValue(item.hotValue),
          category: item.category,
          platform: item.platform,
          platformName: platformInfo.name,
          rank: item.rank,
          excerpt: 'excerpt' in item ? item.excerpt : undefined,
          tag: 'tag' in item ? item.tag : undefined,
          sources: [
            {
              platform: item.platform,
              platformName: platformInfo.name,
              url: item.url,
              title: item.title,
              hotValue: item.hotValue,
            },
          ],
        };
        titleMap.set(normalizedTitle, newItem);
      }
    }
  }

  // 排序：来源数量优先，热度次之
  let allItems = Array.from(titleMap.values())
    .sort((a, b) => {
      if (b.sources.length !== a.sources.length) {
        return b.sources.length - a.sources.length;
      }
      return b.hotValue - a.hotValue;
    })
    .map((item, index) => ({ ...item, rank: index + 1 }));

  // 数据不足时用备用数据补充
  if (shouldUseFallback(allItems)) {
    const fallbackItems = generateFallbackData();
    if (allItems.length > 0) {
      const existingTitles = new Set(allItems.map((item) => normalizeTitle(item.title)));
      const additionalItems = fallbackItems.filter((item) => !existingTitles.has(normalizeTitle(item.title)));
      allItems = [...allItems, ...additionalItems].slice(0, 100);
    } else {
      allItems = fallbackItems;
    }
  }

  const nowIso = new Date().toISOString();

  // 持久化：事件 + 来源 + 趋势采样（单事务）
  const persistAll = db.transaction((items: HotItem[]) => {
    for (const item of items) {
      upsertEvent({
        event_id: item.id,
        title: item.title,
        category: item.category,
        hot_value: item.hotValue,
        hot_display: item.hotValueFormatted,
        rank: item.rank,
        excerpt: item.excerpt ?? null,
        updated_at: nowIso,
      });
      replaceSources(
        item.id,
        item.sources.map((s, i) => ({
          platform: s.platform,
          platform_name: s.platformName,
          url: s.url,
          title: s.title,
          hot_value: s.hotValue,
          raw_rank: i + 1,
        })),
        nowIso,
      );
      insertTrendSample(item.id, nowIso, item.hotValue);
    }
  });
  persistAll(allItems);

  // 清理过期采样
  pruneTrendSamples(new Date(Date.now() - config.trendRetentionMs).toISOString());

  // 更新爬取日志
  for (const [platform, { items, time }] of platformResults) {
    let status: 'online' | 'slow' | 'offline' = 'online';
    if (items.length === 0) {
      status = 'offline';
    } else if (time > 8000) {
      // 经代理的国际源延迟偏高，8 秒内拿到数据均视为在线
      status = 'slow';
    }
    upsertCrawlLog({
      platform,
      status,
      item_count: items.length,
      response_ms: time,
    });
  }
  // 未实现爬虫的平台记为离线
  for (const platform of Object.keys(PLATFORMS)) {
    if (!platformResults.has(platform)) {
      upsertCrawlLog({ platform, status: 'offline', item_count: 0, response_ms: 0 });
    }
  }

  return {
    items: allItems,
    platforms: getPlatformStatuses(),
    updatedAt: nowIso,
  };
}

// 根据 crawl_log + 平台配置构建状态列表
export function getPlatformStatuses(): PlatformStatus[] {
  const logs = new Map(allCrawlLogs().map((l) => [l.platform, l]));
  const now = new Date().toISOString();

  return Object.entries(PLATFORMS).map(([key, info]) => {
    const log = logs.get(key);
    return {
      platform: key,
      platformName: info.name,
      icon: info.icon,
      color: info.color,
      region: info.region,
      status: log?.status ?? 'offline',
      lastUpdate: log?.updated_at ?? now,
      itemCount: log?.item_count ?? 0,
      responseTime: log?.response_ms ?? 0,
      defaultInterval: info.defaultInterval,
      enabled: info.enabled,
    };
  });
}

// 标题标准化（用于去重）
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[#【】[\]《》「」『』]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 20);
}

// 查找相似标题
function findSimilarTitle(map: Map<string, HotItem>, normalizedTitle: string): HotItem | undefined {
  if (map.has(normalizedTitle)) {
    return map.get(normalizedTitle);
  }

  for (const [key, item] of map) {
    if (key.includes(normalizedTitle) || normalizedTitle.includes(key)) {
      if (Math.abs(key.length - normalizedTitle.length) < 5) {
        return item;
      }
    }
  }

  return undefined;
}
