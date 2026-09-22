'use client';

// 全站页脚：品牌简介 + 导航 + 数据源说明

import Link from 'next/link';
import { Flame, TrendingUp, Layers, ShieldCheck } from 'lucide-react';
import { LogoMark } from './logo';

const LINKS = [
  { href: '/', label: '实时热点', icon: Flame },
  { href: '/trend', label: '趋势风向', icon: TrendingUp },
  { href: '/platforms', label: '平台状态', icon: Layers },
  { href: '/compliance', label: '合规与版权声明', icon: ShieldCheck },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-20 border-t border-border/60 bg-card/30">
      <div className="page-container py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* 品牌区 */}
          <div className="space-y-4">
            <span className="flex items-center gap-2.5">
              <LogoMark size={34} />
              <span className="text-gradient-brand text-lg font-bold tracking-tight">热点雷达</span>
            </span>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              热点雷达实时聚合主流内容平台热搜，跨平台去重、智能分类，并用人工智能
              生成事件摘要，让你在一个页面洞悉全网正在发生的事。
            </p>
          </div>

          {/* 导航 */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              导航
            </h4>
            <ul className="space-y-2.5">
              {LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 数据源 */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              数据来源
            </h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              微博 · 知乎 · 百度 · 哔哩哔哩 · 抖音 · 今日头条
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground/70">
              热点信息来自各平台公开热榜，持续更新，仅作信息聚合展示。
            </p>
          </div>
        </div>

        {/* 合规提示 */}
        <div className="mt-10 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
          <p className="text-xs leading-6 text-muted-foreground">
            本站为中立信息聚合工具，仅展示公开热榜标题与自动生成的简短摘要，不转载原文全文；
            所聚合内容的著作权及商标权均归原作者及原平台所有。如认为内容侵权或违规，
            请查看
            <Link
              href="/compliance"
              className="mx-1 font-medium text-primary underline-offset-2 hover:underline"
            >
              《内容合规与版权声明》
            </Link>
            并联系管理员，我们将在核实后及时删除或更正。
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {year} 热点雷达 · 全网热点一站聚合
          </p>
        </div>
      </div>
    </footer>
  );
}
