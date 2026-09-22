'use client';

// 品牌 Logo：雷达波纹 + 扫描 + 中心热点
// showText 控制是否显示品牌名

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  animated?: boolean;
}

export function LogoMark({ size = 36, animated = false, className }: Omit<LogoProps, 'showText'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 drop-shadow-[0_4px_12px_rgba(99,102,241,0.35)]', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#DB2777" />
        </linearGradient>
        <radialGradient id="logoCore" cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="#FDE68A" />
          <stop offset="0.6" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F59E0B" />
        </radialGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill="url(#logoBg)" />

      {/* 扫描层（可旋转） */}
      <g className={animated ? 'animate-radar-sweep' : undefined} style={{ transformOrigin: '32px 32px' }}>
        <path d="M32 32L32 11.5A20.5 20.5 0 0 1 52.5 32H32Z" fill="white" fillOpacity="0.18" />
      </g>

      <circle cx="32" cy="32" r="20.5" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" />
      <circle cx="32" cy="32" r="13.5" stroke="white" strokeOpacity="0.28" strokeWidth="1.4" />
      <circle cx="32" cy="32" r="6.5" stroke="white" strokeOpacity="0.4" strokeWidth="1.3" />

      <circle cx="32" cy="32" r="4.5" fill="url(#logoCore)" />
    </svg>
  );
}

export function Logo({ size = 36, showText = true, animated = false, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} animated={animated} />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight text-gradient-brand sm:text-base">
            热点雷达
          </span>
          <span className="mt-1 text-[10px] font-medium tracking-[0.2em] text-muted-foreground">
            全网热点实时聚合
          </span>
        </span>
      )}
    </span>
  );
}
