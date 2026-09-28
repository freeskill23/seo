'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface RadarDataItem {
  [key: string]: { mine: number; competitor: number };
}

interface CompetitivenessRadarProps {
  data: RadarDataItem;
  height?: number;
}

export function CompetitivenessRadar({ data, height = 350 }: CompetitivenessRadarProps) {
  const chartData = Object.entries(data).map(([key, values]) => ({
    metric: key,
    mine: values.mine,
    competitor: values.competitor,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#374151' }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Radar name="내 상품" dataKey="mine" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
        <Radar name="TOP10 평균" dataKey="competitor" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
