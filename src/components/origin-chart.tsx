
"use client";

import * as React from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
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
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
           <ChartLegend
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
