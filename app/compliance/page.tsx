import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {
  ShieldCheck,
  Copyright,
  Quote,
  MailWarning,
  Sparkles,
  Scale,
  ArrowLeft,
} from 'lucide-react';

export const metadata: Metadata = {
  title: '内容合规与版权声明 - 热点雷达',
  description:
    '热点雷达内容合规与版权声明：信息聚合性质、第三方版权归属、合理使用边界、侵权投诉渠道及人工智能生成内容说明。',
};

const SECTIONS = [
  {
    icon: ShieldCheck,
    title: '一、内容性质说明',
    paragraphs: [
      '热点雷达是一个中立的信息聚合与检索工具，本身不采编、不生产新闻原文。网站展示的热搜标题、排名及热度数据，均来自各内容平台对外公开的热榜，并保持持续更新。',
      '对同一事件，网站会进行跨平台去重与智能分类，并通过人工智能生成简短的概述与背景说明，以帮助用户快速了解事件梗概。完整内容请以来源平台公开发布的原文为准。',
    ],
  },
  {
    icon: Copyright,
    title: '二、版权与商标归属',
    paragraphs: [
      '本网站所聚合展示的热搜条目、标题、图文、视频等内容，其著作权及相关知识产权均归原作者、原发布平台或其他合法权利人所有。“微博”“知乎”“百度”“哔哩哔哩”“抖音”“今日头条”等平台名称及标识，均为各自权利人的商标或品牌标识，本网站仅在说明数据来源时予以引用。',
      '本网站不主张对第三方内容享有任何权利，亦不会将第三方内容用于商业售卖。',
    ],
  },
  {
    icon: Quote,
    title: '三、合理使用边界',
    paragraphs: [
      '网站对第三方内容的使用遵循合理使用原则：仅展示热搜标题及自动生成的简短摘要，不转载原文全文，并在每条热点下提供跳转至来源平台的链接，用户如需了解详情可直接访问原始页面。',
      '如相关权利人认为网站的聚合展示超出合理使用范围，可随时通过本声明第四部分的渠道通知我们处理。',
    ],
  },
  {
    icon: MailWarning,
    title: '四、侵权投诉与处理',
    paragraphs: [
      '我们尊重每一位权利人的合法权益。若您认为本网站聚合的任何内容侵犯了您的著作权、商标权、隐私权或其他合法权益，或违反相关法律法规，请通过网站管理员渠道向我们送达权利通知，并提供以下材料：权利人身份证明、涉嫌侵权内容的准确网址、权属证明材料以及有效的联系方式。',
      '我们在核实相关情况后，将及时采取删除、屏蔽链接或断开指向等必要措施，切实保障权利人的合法权益。',
    ],
  },
  {
    icon: Sparkles,
    title: '五、人工智能生成内容声明',
    paragraphs: [
      '本网站的事件概述、背景、要点等解读内容由人工智能自动生成，可能存在信息滞后、理解偏差甚至错漏，仅供用户参考，不代表本网站立场，亦不构成任何新闻认定、投资建议或专业意见。',
      '人工智能在生成过程中被明确要求：遵守法律法规、客观中立、不编造事实、不照抄第三方原文。如您发现相关内容存在事实错误或侵权情形，欢迎通过上述渠道反馈，我们将及时更正或删除。',
    ],
  },
  {
    icon: Scale,
    title: '六、合规运营承诺',
    paragraphs: [
      '本网站严格遵守《中华人民共和国网络安全法》《中华人民共和国著作权法》《互联网信息服务管理办法》等相关法律法规，坚持合规运营，自觉抵制违法和不良信息。',
      '本声明的解释、修订及更新权归热点雷达所有。本声明未尽事宜，依照相关法律法规执行。',
    ],
  },
];

export default function CompliancePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* 页头 */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="bg-grid-pattern absolute inset-0" />
          <div
            className="pointer-events-none absolute -top-24 left-1/4 h-72 w-96 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--glow-2) 0%, transparent 70%)' }}
          />
          <div className="page-container relative py-12 lg:py-16">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回首页
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3 w-3" />
              合规运营
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              内容合规与<span className="text-gradient-brand">版权声明</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              热点雷达尊重知识产权、坚持合规运营。请在使用本网站前阅读以下声明，了解网站的信息聚合性质、内容版权归属、合理使用边界以及侵权投诉方式。
            </p>
          </div>
        </section>

        {/* 声明正文 */}
        <section className="page-container-narrow py-10">
          <div className="space-y-5">
            {SECTIONS.map(({ icon: Icon, title, paragraphs }) => (
              <div key={title} className="premium-card p-6 sm:p-7">
                <h2 className="mb-4 flex items-center gap-2.5 text-base font-bold tracking-tight sm:text-lg">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  {title}
                </h2>
                <div className="space-y-3">
                  {paragraphs.map((text) => (
                    <p key={text} className="text-sm leading-7 text-muted-foreground">
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground/70">
            最后更新日期：2026 年 9 月 22 日
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
