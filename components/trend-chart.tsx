'use client';

import { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { TrendPoint } from '@/lib/types';

interface TrendChartProps {
  data: TrendPoint[];
  height?: number;
}

export function TrendChart({ data, height = 200 }: TrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      time: new Date(point.sample_at).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      heat: point.heat_score,
      fullTime: new Date(point.sample_at).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: { value: number; payload: { fullTime: string } }[];
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg shadow-sm p-2">
          <p className="text-xs text-muted-foreground">{payload[0].payload.fullTime}</p>
          <p className="text-sm font-medium">
            热度: <span className="text-primary">{payload[0].value.toFixed(1)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="heatGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="heat"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#heatGradient)"
          dot={false}
          activeDot={{ r: 4, fill: 'var(--primary)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
