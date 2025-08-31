
"use client";

import * as React from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend, LabelProps } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
} from "@/components/ui/chart";

interface OriginChartProps {
  data: { name: string; value: number }[];
}

const chartConfig = {
  value: {
    label: "Receita",
  },
} satisfies ChartConfig;

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = (props: LabelProps & { percent: number }) => {
  const { cx, cy, midAngle, innerRadius = 0, outerRadius = 0, percent } = props as any;
  if (percent === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-xs font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


export default function OriginChart({ data }: OriginChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  // Adicionando a configuração dinâmica ao chartConfig
  chartData.forEach(item => {
      chartConfig[item.name as keyof typeof chartConfig] = {
          label: item.name,
          color: item.fill,
      }
  })

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent 
                hideLabel 
                nameKey="name"
                formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value}
            />}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            strokeWidth={2}
            labelLine={false}
            label={renderCustomizedLabel}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
           <Legend
            content={<ChartLegendContent nameKey="name" />}
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{paddingTop: 20}}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
