// 百度热搜爬虫 - 静默失败模式

import { defaultHeaders, cleanText, parseHotValue, classifyCategory, generateId, withRetry } from './utils.js';

export interface BaiduHotItem {
  id: string;
  title: string;
  url: string;
  hotValue: number;
  category: string;
  platform: string;
  rank: number;
  desc?: string;
}

interface BaiduBoardItem {
  word?: string;
  desc?: string;
  hotScore?: string;
  rawUrl?: string;
  url?: string;
  // wise 接口的包装层
  content?: BaiduBoardItem[];
}

interface BaiduApiResponse {
  data: {
    cards: Array<{
      content: BaiduBoardItem[];
    }>;
  };
}

export async function fetchBaiduHot(): Promise<BaiduHotItem[]> {
  // 优先移动端 wise 接口，失败（风控/改版）时回退 PC 接口，两路均静默
  const result = await withRetry(async () => {
    // 注意：空数组是 truthy，必须按 length 判断，否则 wise 返回 0 条时会短路、PC 路径不执行
    const wise = await requestBoard('https://top.baidu.com/api/board?platform=wise&tab=realtime', defaultHeaders);
    if (wise && wise.length > 0) {
      return wise;
    }
    return requestBoard('https://top.baidu.com/api/board?platform=pc&tab=realtime', PC_HEADERS);
  });

  return result || [];
}

const PC_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

async function requestBoard(url: string, headers: Record<string, string>): Promise<BaiduHotItem[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: {
        ...headers,
        Referer: 'https://top.baidu.com/',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      return null;
    }

    const data = JSON.parse(text) as BaiduApiResponse;
    return mapBoard(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mapBoard(data: BaiduApiResponse): BaiduHotItem[] {
  const items: BaiduHotItem[] = [];

  const cards = data.data?.cards || [];
  for (const card of cards) {
    // wise 接口为嵌套结构：card.content[].content[] 才是真实条目；
    // pc 接口为平铺结构：card.content[] 即真实条目。这里统一拍平
    const rawContent = card.content || [];
    const content = rawContent.flatMap((entry) =>
      entry.word ? [entry] : Array.isArray(entry.content) ? entry.content : [],
    );

    for (const item of content) {
      if (items.length >= 50) break;
      if (item.word) {
        const title = cleanText(item.word);
        items.push({
          id: generateId('baidu', title),
          title,
          url: item.rawUrl || item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
          hotValue: parseHotValue(item.hotScore || '0'),
          category: classifyCategory(title),
          platform: 'baidu',
          rank: items.length + 1,
          desc: item.desc ? cleanText(item.desc) : undefined,
        });
      }
    }
  }

  return items;
}
