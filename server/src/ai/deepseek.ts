// DeepSeek 调用（OpenAI 兼容接口，直接用 fetch，无需 SDK）

import { config } from '../config.js';

export interface ChatOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export async function callDeepSeek({
  system,
  user,
  maxTokens = 500,
  temperature = 0.7,
  jsonMode = false,
}: ChatOptions): Promise<string> {
  if (!config.deepseek.apiKey) {
    throw new Error('未配置 DeepSeek API 密钥');
  }

  // 超时控制（AbortController），避免请求无限挂起
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.deepseek.timeoutMs);

  try {
    const response = await fetch(`${config.deepseek.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseek.apiKey}`,
      },
      body: JSON.stringify({
        model: config.deepseek.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: maxTokens,
        temperature,
        stream: false,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`DeepSeek 接口异常（${response.status}）：${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek 返回内容为空');
    }
    return content;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`DeepSeek 请求超时（${config.deepseek.timeoutMs}ms）`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
