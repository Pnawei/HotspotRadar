// 抖音热榜爬虫 - 静默失败模式

import { defaultHeaders, cleanText, classifyCategory, generateId, withRetry } from './utils.js';

export interface DouyinHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
  label?: string;
}

interface DouyinApiResponse {
  data: {
    word_list: Array<{
      word: string;
      hot_value?: number;
      label?: number;
      sentence_id?: string;
    }>;
  };
  status_code: number;
}

export async function fetchDouyinHot(): Promise<DouyinHotItem[]> {
  const result = await withRetry(async () => {
    const response = await fetch('https://www.douyin.com/aweme/v1/web/hot/search/list/', {
      headers: {
        ...defaultHeaders,
        Referer: 'https://www.douyin.com/',
      },
    });

    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      return [];
    }

    const data = JSON.parse(text) as DouyinApiResponse;

    if (data.status_code !== 0) {
      return [];
    }

    const items: DouyinHotItem[] = [];
    const wordList = data.data?.word_list || [];

    for (let i = 0; i < wordList.length && items.length < 50; i++) {
      const item = wordList[i];
      if (item.word) {
        const title = cleanText(item.word);
        const labelMap: Record<number, string> = {
          0: '',
          1: '热',
          2: '新',
          3: '荐',
        };

        items.push({
          id: generateId('douyin', title),
          title,
          url: `https://www.douyin.com/search/${encodeURIComponent(title)}`,
          hotValue: item.hot_value || (50 - i) * 10000,
          category: classifyCategory(title),
          platform: 'douyin',
          rank: i + 1,
          label: item.label !== undefined ? labelMap[item.label] : undefined,
        });
      }
    }

    return items;
  });

  return result || [];
}
