// 非中文内容翻译为中文（DeepSeek + 本地缓存）
// 仅用于列表/详情标题，避免重复调用 AI

import { createHash } from 'node:crypto';
import { callDeepSeek } from './deepseek.js';
import { getTranslation, setTranslation } from '../db/database.js';

const HAS_CHINESE = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const HAS_WHITESPACE = /\s/;

/** 判断文本是否包含中文字符（包含即视为中文，无需翻译） */
export function isChineseText(text: string): boolean {
  return HAS_CHINESE.test(text);
}

/** 归一化：小写 + 去除空白与常见标点，用于比较译文是否实质等于原文 */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s_/\-.:,，。、!?！？'"'"'"]/g, '');
}

function hash(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

/**
 * 将非中文文本翻译为中文。
 * - 中文文本直接返回 null（无需翻译）
 * - 命中缓存直接返回
 * - 未命中时调用 DeepSeek，成功后写入缓存
 * - 失败返回 null（前端不展示译文，不影响主流程）
 */
export async function translateToZh(text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (isChineseText(trimmed)) return null;
  // 无空格的纯 ASCII（仓库名、ID、短标识符）不翻译
  if (!HAS_WHITESPACE.test(trimmed)) return null;

  const key = hash(trimmed);
  const cached = getTranslation(key);
  if (cached) return cached;

  try {
    const translated = await callDeepSeek({
      system:
        '你是一名专业翻译。请将用户给出的文本翻译为简体中文，要求准确、通顺、符合中文表达习惯。只输出译文本身，不要添加解释、引号或前后缀。',
      user: trimmed,
      maxTokens: 200,
      temperature: 0.3,
    });

    const result = translated.trim();
    if (!result) return null;

    // 兜底：译文与原文实质相同时（AI 未翻译，如技术标识符），不返回译文
    if (normalize(result) === normalize(trimmed)) return null;

    setTranslation(key, trimmed, result, new Date().toISOString());
    return result;
  } catch (error) {
    console.warn('[translate] 翻译失败，已忽略：', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * 批量翻译：仅对非中文文本调用，并发受控，失败单项跳过。
 * 用于列表接口，避免逐条顺序阻塞。
 */
export async function translateMany(texts: string[]): Promise<Array<string | null>> {
  const needTranslate: Array<{ idx: number; text: string }> = [];
  const results: Array<string | null> = new Array(texts.length).fill(null);

  texts.forEach((text, idx) => {
    const trimmed = (text || '').trim();
    if (trimmed && !isChineseText(trimmed)) {
      needTranslate.push({ idx, text: trimmed });
    }
  });

  if (needTranslate.length === 0) return results;

  // 控制并发为 5，避免一次性打满 AI 配额
  const CONCURRENCY = 5;
  let cursor = 0;

  async function worker() {
    while (cursor < needTranslate.length) {
      const item = needTranslate[cursor++];
      results[item.idx] = await translateToZh(item.text);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, needTranslate.length) }, () => worker()),
  );

  return results;
}
