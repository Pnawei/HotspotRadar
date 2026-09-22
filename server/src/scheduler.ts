// 定时爬取调度器：按固定间隔执行全站爬取，上一次未结束则跳过本轮

import { crawlAndPersist } from './crawler/index.js';
import { config } from './config.js';

export function startScheduler(): void {
  let running = false;

  const run = async (label: string) => {
    if (running) return;
    running = true;
    const startedAt = Date.now();
    try {
      const { items } = await crawlAndPersist();
      console.log(`[scheduler] ${label}完成：${items.length} 条，耗时 ${Date.now() - startedAt}ms`);
    } catch (error) {
      console.error(`[scheduler] ${label}失败:`, error);
    } finally {
      running = false;
    }
  };

  setInterval(() => {
    void run('定时爬取');
  }, config.crawlIntervalMs);

  console.log(`[scheduler] 已启动，每 ${Math.round(config.crawlIntervalMs / 1000)} 秒爬取一次`);
}
