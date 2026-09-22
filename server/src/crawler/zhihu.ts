// 知乎热榜爬虫 - 静默失败模式

import { defaultHeaders, cleanText, parseHotValue, classifyCategory, generateId, withRetry } from './utils.js';
import { config } from '../config.js';

export interface ZhihuHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
  excerpt?: string;
}

interface ZhihuApiResponse {
  data: Array<{
    target: {
      title?: string;
      id?: number;
      excerpt?: string;
    };
    detail_text?: string;
  }>;
}

export async function fetchZhihuHot(): Promise<ZhihuHotItem[]> {
  // 未配置登录 Cookie 时知乎热榜接口固定返回 401，直接放弃，避免无效请求
  if (!config.zhihuCookie) {
    return [];
  }

  const result = await withRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response: Response;
    try {
      response = await fetch('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50', {
        headers: {
          ...defaultHeaders,
          Referer: 'https://www.zhihu.com/hot',
          Cookie: config.zhihuCookie,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      // 知乎需要登录态，返回空数据让系统使用备用数据
      return [];
    }

    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      return [];
    }

    const data = JSON.parse(text) as ZhihuApiResponse;
    const items: ZhihuHotItem[] = [];

    for (let i = 0; i < (data.data || []).length; i++) {
      const item = data.data[i];
      const target = item.target;

      if (target?.title) {
        const title = cleanText(target.title);
        const hotText = item.detail_text || '0';

        items.push({
          id: generateId('zhihu', title),
          title,
          url: `https://www.zhihu.com/question/${target.id}`,
          hotValue: parseHotValue(hotText.replace('万热度', '万').replace('热度', '')),
          category: classifyCategory(title),
          platform: 'zhihu',
          rank: i + 1,
          excerpt: target.excerpt ? cleanText(target.excerpt).slice(0, 100) : undefined,
        });
      }
    }

    return items;
  });

  return result || [];
}
