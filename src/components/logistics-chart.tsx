
"use client";

import * as React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface LogisticsChartProps {
  data: { name: string; value: number }[];
}

const chartConfig = {
  value: {
    label: "Receita",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function LogisticsChart({ data }: LogisticsChartProps) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 0, left: -20 }}
          accessibilityLayer
        >
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `R$${Number(value) / 1000}k`}
          />
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent
                nameKey="name"
                formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value}
             />}
          />
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
