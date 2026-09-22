// 微博热搜爬虫 - 静默失败模式

import { defaultHeaders, cleanText, classifyCategory, generateId, withRetry } from './utils.js';

export interface WeiboHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
  tag?: string;
}

interface WeiboApiResponse {
  ok: number;
  data: {
    realtime: Array<{
      word: string;
      num?: number;
      raw_hot?: number;
      label_name?: string;
    }>;
  };
}

export async function fetchWeiboHot(): Promise<WeiboHotItem[]> {
  const result = await withRetry(async () => {
    // 使用移动端 API
    const response = await fetch(
      'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot',
      {
        headers: {
          ...defaultHeaders,
          Referer: 'https://m.weibo.cn/',
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      return [];
    }

    const data = JSON.parse(text) as {
      ok: number;
      data: { cards: Array<{ card_group?: Array<{ desc?: string; desc_extr?: number }> }> };
    };

    if (data.ok !== 1) {
      return [];
    }

    const items: WeiboHotItem[] = [];
    const cards = data.data?.cards || [];

    for (const card of cards) {
      const cardGroup = card.card_group || [];
      for (let i = 0; i < cardGroup.length && items.length < 50; i++) {
        const item = cardGroup[i];
        if (item.desc) {
          const title = cleanText(item.desc);
          items.push({
            id: generateId('weibo', title),
            title,
            url: `https://s.weibo.com/weibo?q=${encodeURIComponent(title)}`,
            hotValue: item.desc_extr || 0,
            category: classifyCategory(title),
            platform: 'weibo',
            rank: items.length + 1,
          });
        }
      }
    }

    return items;
  });

  return result || [];
}

// 备用方案：使用网页版热搜
export async function fetchWeiboHotFallback(): Promise<WeiboHotItem[]> {
  const result = await withRetry(async () => {
    const response = await fetch('https://weibo.com/ajax/side/hotSearch', {
      headers: {
        ...defaultHeaders,
        Referer: 'https://weibo.com/',
      },
    });

    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      return [];
    }

    const data = JSON.parse(text) as WeiboApiResponse;

    if (data.ok !== 1) {
      return [];
    }

    const items: WeiboHotItem[] = [];
    const realtime = data.data?.realtime || [];

    for (let i = 0; i < realtime.length && items.length < 50; i++) {
      const item = realtime[i];
      if (item.word) {
        const title = cleanText(item.word);
        items.push({
          id: generateId('weibo', title),
          title,
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent(title)}`,
          hotValue: item.num || item.raw_hot || 0,
          category: classifyCategory(title),
          platform: 'weibo',
          rank: items.length + 1,
          tag: item.label_name,
        });
      }
    }

    return items;
  });

  return result || [];
}
