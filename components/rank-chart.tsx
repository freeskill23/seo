'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
} from 'recharts';
import type { RankingHistory, ProductChange } from '@/lib/types';
import { formatDate } from '@/lib/format';

interface RankChartProps {
  data: RankingHistory[];
  events?: ProductChange[];
  keywordLabel?: string;
  height?: number;
}

export function RankChart({ data, events = [], keywordLabel, height = 300 }: RankChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        관찰 순위 데이터가 없습니다.
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

  const chartData = sorted.map((d) => ({
    date: d.recorded_at,
    rank: d.observed_rank,
    label: formatDate(d.recorded_at),
  }));

  const maxRank = Math.max(...chartData.map((d) => d.rank), 10);
  const yDomain = [Math.min(1, Math.min(...chartData.map((d) => d.rank)) - 2), maxRank + 2];

  const eventMap = new Map<string, ProductChange>();
  for (const e of events) {
    eventMap.set(e.changed_at, e);
  }

  const eventPoints = chartData.filter((d) => eventMap.has(d.date));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          interval="preserveStartEnd"
          tickCount={6}
        />
        <YAxis
          reversed
          domain={yDomain}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          allowDecimals={false}
          label={{ value: '관찰 순위', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(value: number) => [`${value}위`, keywordLabel || '관찰 순위']}
          labelFormatter={(label) => `날짜: ${label}`}
        />
        {keywordLabel && <Legend wrapperStyle={{ fontSize: 12 }} />}
        <Line
          type="monotone"
          dataKey="rank"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ r: 2, fill: '#0ea5e9' }}
          activeDot={{ r: 5 }}
          name={keywordLabel || '관찰 순위'}
        />
        {eventPoints.map((point, i) => (
          <ReferenceDot
            key={i}
            x={point.label}
            y={point.rank}
            r={6}
            fill="#f59e0b"
            stroke="#fff"
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
