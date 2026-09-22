// B站热门爬虫 - 静默失败模式

import { defaultHeaders, cleanText, classifyCategory, generateId, withRetry } from './utils.js';

export interface BilibiliHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
  icon?: string;
}

interface BilibiliApiResponse {
  code: number;
  data: {
    list: Array<{
      keyword: string;
      show_name?: string;
      heat_score?: number;
      icon?: string;
    }>;
  };
}

export async function fetchBilibiliHot(): Promise<BilibiliHotItem[]> {
  const result = await withRetry(async () => {
    const response = await fetch('https://app.bilibili.com/x/v2/search/trending/ranking', {
      headers: {
        ...defaultHeaders,
        Referer: 'https://www.bilibili.com/',
      },
    });

    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      return [];
    }

    const data = JSON.parse(text) as BilibiliApiResponse;

    if (data.code !== 0) {
      return [];
    }

    const items: BilibiliHotItem[] = [];
    const list = data.data?.list || [];

    for (let i = 0; i < list.length && items.length < 50; i++) {
      const item = list[i];
      if (item.keyword || item.show_name) {
        const title = cleanText(item.show_name || item.keyword);
        items.push({
          id: generateId('bilibili', title),
          title,
          url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(title)}`,
          hotValue: item.heat_score || (50 - i) * 10000, // 没有热度值时按排名估算
          category: classifyCategory(title),
          platform: 'bilibili',
          rank: i + 1,
          icon: item.icon,
        });
      }
    }

    return items;
  });

  return result || [];
}
