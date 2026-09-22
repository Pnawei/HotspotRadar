// 代理 HTTP 工具：国际平台在国内网络无法直连，统一通过本地代理（默认 Clash Verge 7897）访问。
// 国内平台继续使用全局直连，不受代理影响。

import { fetch as undiciFetch, ProxyAgent } from 'undici';
import { config } from '../config.js';

let agent: ProxyAgent | null = null;

function getAgent(): ProxyAgent {
  if (!agent) {
    agent = new ProxyAgent(config.proxyUrl);
  }
  return agent;
}

// undici 的 RequestInit 扩展（超时/重定向/调度器），各爬虫直接传字面量
export interface ProxyRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  maxRedirections?: number;
  bodyTimeout?: number;
  headersTimeout?: number;
}

// 经代理发起请求；未启用代理（PROXY_URL=none）时回退直连
export async function proxyFetch(url: string, init: ProxyRequestInit = {}): Promise<Response> {
  if (!config.proxyUrl) {
    const { maxRedirections: _m, bodyTimeout: _b, headersTimeout: _h, ...nativeInit } = init;
    void _m; void _b; void _h;
    return fetch(url, nativeInit);
  }
  return undiciFetch(url, {
    maxRedirections: 5,
    ...init,
    dispatcher: getAgent(),
  }) as unknown as Promise<Response>;
}
