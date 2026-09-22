// 热点内容扩充服务
// 爬取后由后台 worker 调用 DeepSeek：核查事件真实性 + 生成背景/要点/影响等结构化内容
// 设计原则：不诱导模型编造；信息不足时明确标注 uncertain；所有结果落库复用，避免重复计费

import { callDeepSeek } from './deepseek.js';
import {
  listEventsNeedingEnrichment,
  setEventEnrichment,
  type PendingEnrichment,
} from '../db/database.js';
import { getCategoryName } from '../constants.js';
import { config } from '../config.js';

export type VerificationStatus = 'verified' | 'unverified' | 'uncertain';

export interface EventEnrichment {
  verified: VerificationStatus;
  summary: string;
  background: string;
  keyPoints: string[];
  impact: string;
  trend: string;
}

const SYSTEM_PROMPT = `你是一名严谨的新闻事实核查员与资讯编辑。请基于你"确实掌握的真实信息"，对用户给出的热点事件进行真实性核查与内容扩充。

硬性要求：
1. 只输出一个 JSON 对象，不要输出 JSON 以外的任何文字。JSON 结构为：
{
  "verified": "verified" | "unverified" | "uncertain",
  "summary": "事件概述，2-4句，60-120字",
  "background": "事件背景与起因，2-4句",
  "keyPoints": ["核心要点1", "核心要点2", "核心要点3"],
  "impact": "舆情反应与社会影响，2-3句",
  "trend": "后续可能的发展方向，1-2句"
}
2. verified 取值规则：
   - "verified"：你能依据已知真实信息确认该事件真实存在；
   - "unverified"：该事件已被证伪、属于谣言或严重失实；
   - "uncertain"：你不了解该事件或信息不足，此时其他字段如实填写已知信息，不得编造。
3. 所有字段使用中文，内容客观中立，不臆造人物、时间、数据；keyPoints 最多5条。
4. 合规与版权要求：
   - 严格遵守中华人民共和国法律法规，不生成违法、低俗、造谣或侵犯他人合法权益的内容；
   - 仅做事实性概述与合理引用，不得大段照抄任何第三方原创报道或作品原文，避免侵权；
   - 概述应为你自行组织的语言；涉及具体事实时以权威公开信源为准，不泄露个人隐私与敏感信息。`;

// 调用 DeepSeek 并解析为结构化扩充内容
export async function enrichSingleEvent(
  title: string,
  categoryName = '综合',
): Promise<EventEnrichment> {
  const raw = await callDeepSeek({
    system: SYSTEM_PROMPT,
    user: `热点标题：${title}\n所属分类：${categoryName}`,
    maxTokens: 900,
    temperature: 0.3,
    jsonMode: true,
  });

  return normalizeEnrichment(parseEnrichmentJson(raw));
}

// 扩充单个事件并落库
export async function enrichAndPersist(event: PendingEnrichment): Promise<EventEnrichment> {
  const enrichment = await enrichSingleEvent(event.title, getCategoryName(event.category));
  const now = new Date().toISOString();
  setEventEnrichment(
    event.event_id,
    JSON.stringify(enrichment),
    enrichment.verified === 'verified' ? 1 : 0,
    now,
  );
  return enrichment;
}

// ---------- JSON 解析（容错） ----------

function parseEnrichmentJson(raw: string): Partial<EventEnrichment> {
  try {
    return JSON.parse(raw) as Partial<EventEnrichment>;
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as Partial<EventEnrichment>;
      } catch {
        // fall through
      }
    }
    // 模型未按 JSON 返回：降级为纯文本概述
    return { verified: 'uncertain', summary: raw.replace(/[#*`\n]/g, ' ').slice(0, 500) };
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEnrichment(input: Partial<EventEnrichment>): EventEnrichment {
  const verified: VerificationStatus =
    input.verified === 'verified' || input.verified === 'unverified'
      ? input.verified
      : 'uncertain';

  const keyPoints = Array.isArray(input.keyPoints)
    ? input.keyPoints.map((p) => asString(p)).filter(Boolean).slice(0, 5)
    : [];

  return {
    verified,
    summary: asString(input.summary),
    background: asString(input.background),
    keyPoints,
    impact: asString(input.impact),
    trend: asString(input.trend),
  };
}

// ---------- 后台 worker ----------

export function startEnrichmentWorker(): void {
  let busy = false;

  async function tick(): Promise<void> {
    if (busy) return;
    // 未配置 API Key 时直接跳过（不产生费用）
    if (!config.deepseek.apiKey) return;

    busy = true;
    try {
      const pending = listEventsNeedingEnrichment(
        config.enrichBatchSize,
        config.enrichTtlMs,
      );

      if (pending.length === 0) return;

      console.log(`[enrich] 开始扩充 ${pending.length} 个热点...`);

      for (const event of pending) {
        try {
          await enrichAndPersist(event);
          console.log(`[enrich] 已扩充：${event.title}`);
        } catch (error) {
          // 单个失败不影响其他事件，下一轮自动重试
          console.warn(
            `[enrich] 扩充失败（下轮重试）：${event.title} -`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    } finally {
      busy = false;
    }
  }

  // 启动 15 秒后执行一次，之后每 10 分钟检查待扩充队列
  setTimeout(() => void tick(), 15_000).unref?.();
  setInterval(() => void tick(), 10 * 60_000).unref?.();
}
