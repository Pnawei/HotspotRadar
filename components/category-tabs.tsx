'use client';

// 分类切换
// 桌面：水平胶囊横排（静态） · 移动：横向滚动（导航下方 sticky）

import { cn } from '@/lib/utils';
import { Flame, Users, Film, Cpu, TrendingUp, Globe, Dumbbell } from 'lucide-react';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  全部: Flame,
  社会: Users,
  娱乐: Film,
  科技: Cpu,
  财经: TrendingUp,
  国际: Globe,
  体育: Dumbbell,
};

export function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="sticky top-16 z-30 -mx-4 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-2xl lg:border lg:bg-card/50 lg:px-3 lg:py-2 lg:backdrop-blur-none">
      <div className="scrollbar-hide flex gap-1.5 overflow-x-auto lg:flex-wrap lg:overflow-visible">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          const Icon = categoryIcons[category] || Flame;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={cn(
                'flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold',
                'transition-all duration-300 active:scale-95',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', isActive && 'animate-bounce-subtle')} />
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
