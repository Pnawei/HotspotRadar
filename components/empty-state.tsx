'use client';

import { Inbox, RefreshCw, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  type?: 'empty' | 'error';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  type = 'empty',
  title,
  description,
  action,
}: EmptyStateProps) {
  const Icon = type === 'error' ? AlertCircle : Inbox;
  const defaultTitle = type === 'error' ? '加载失败' : '暂无数据';
  const defaultDescription = type === 'error' 
    ? '请检查网络连接后重试' 
    : '当前分类下暂无热点内容';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 ${
        type === 'error' ? 'bg-red-50' : 'bg-muted'
      }`}>
        <Icon className={`w-8 h-8 ${type === 'error' ? 'text-red-500' : 'text-muted-foreground'}`} />
      </div>
      <h3 className="text-base font-medium text-foreground mb-1">
        {title || defaultTitle}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
        {description || defaultDescription}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}
