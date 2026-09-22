// 爬虫工具函数

// 请求头模拟浏览器
export const defaultHeaders: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
};

// 延迟函数
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 重试包装器（静默失败）
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 1,
  delayMs = 500,
): Promise<T | null> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch {
      // 静默失败，不打印错误
      if (i < maxRetries) {
        await delay(delayMs);
      }
    }
  }
  return null;
}

// 文本清理
export function cleanText(text: string): string {
  return text
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 热度数值解析（如 "1.2万" -> 12000）
export function parseHotValue(value: string | number): number {
  if (typeof value === 'number') return value;

  const str = value.toString().trim();

  const wanMatch = str.match(/^([\d.]+)\s*万$/);
  if (wanMatch) {
    return Math.round(parseFloat(wanMatch[1]) * 10000);
  }

  const yiMatch = str.match(/^([\d.]+)\s*亿$/);
  if (yiMatch) {
    return Math.round(parseFloat(yiMatch[1]) * 100000000);
  }

  const num = parseFloat(str.replace(/,/g, ''));
  return isNaN(num) ? 0 : Math.round(num);
}

// 格式化热度显示
export function formatHotValue(value: number): string {
  if (value >= 100000000) {
    return (value / 100000000).toFixed(1) + '亿';
  }
  if (value >= 10000) {
    return (value / 10000).toFixed(1) + '万';
  }
  return value.toString();
}

// 简单分类器
export function classifyCategory(title: string): string {
  const keywords: Record<string, string[]> = {
    entertainment: ['演员', '明星', '综艺', '电影', '电视剧', '歌手', '演唱会', '粉丝', '偶像', '导演', '票房', '颁奖', '番剧', '动漫'],
    technology: ['AI', '人工智能', 'ChatGPT', '手机', '苹果', '华为', '小米', '芯片', '5G', '互联网', '软件', '科技', '数码', '编程', 'Python', 'GPU'],
    finance: ['股市', '基金', '房价', '经济', '央行', '利率', '投资', '理财', 'A股', '涨停', '跌停', 'GDP', '通胀'],
    sports: ['足球', '篮球', 'NBA', '世界杯', '奥运', '冠军', '联赛', '比赛', '选手', '金牌', '体育'],
    international: ['美国', '俄罗斯', '日本', '韩国', '欧洲', '国际', '外交', '战争', '冲突', '联合国'],
  };

  for (const [category, words] of Object.entries(keywords)) {
    if (words.some((word) => title.includes(word))) {
      return category;
    }
  }

  return 'social';
}

// 生成唯一 ID
export function generateId(platform: string, title: string): string {
  return `${platform}-${simpleHash(title)}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
