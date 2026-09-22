// 今日头条热榜爬虫 - 静默失败模式

import { defaultHeaders, cleanText, classifyCategory, generateId, withRetry } from './utils.js';

export interface ToutiaoHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
}

interface ToutiaoApiResponse {
  data: Array<{
    Title: string;
    HotValue?: string;
    Url?: string;
    ClusterIdStr?: string;
  }>;
}

export async function fetchToutiaoHot(): Promise<ToutiaoHotItem[]> {
  const result = await withRetry(async () => {
    const response = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
      headers: {
        ...defaultHeaders,
        Referer: 'https://www.toutiao.com/',
      },
    });

    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      return [];
    }

    const data = JSON.parse(text) as ToutiaoApiResponse;
    const items: ToutiaoHotItem[] = [];
    const list = data.data || [];

    for (let i = 0; i < list.length && items.length < 50; i++) {
      const item = list[i];
      if (item.Title) {
        const title = cleanText(item.Title);
        items.push({
          id: generateId('toutiao', title),
          title,
          url: item.Url || `https://www.toutiao.com/search?keyword=${encodeURIComponent(title)}`,
          hotValue: parseInt(item.HotValue || '0') || (50 - i) * 10000,
          category: classifyCategory(title),
          platform: 'toutiao',
          rank: i + 1,
        });
      }
    }

    return items;
  });

  return result || [];
}
