
"use client";

import * as React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface RevenueCostsChartProps {
  data: {
    month: string;
    revenue: number;
    discounts: number;
    cmv: number;
    shipping: number;
  }[];
}

const chartConfig = {
  revenue: {
    label: "Faturamento",
    color: "hsl(var(--chart-2))",
  },
  discounts: {
    label: "Descontos",
    color: "hsl(var(--chart-3))",
  },
  cmv: {
    label: "CMV",
    color: "hsl(var(--chart-4))",
  },
  shipping: {
    label: "Frete",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export default function RevenueCostsChart({ data }: RevenueCostsChartProps) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 0, left: -20 }}
        >
          <XAxis
            dataKey="month"
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
                formatter={(value, name) => {
                    const formattedValue = typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value;
                    return (
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{backgroundColor: chartConfig[name as keyof typeof chartConfig].color}}/>
                           <span>{chartConfig[name as keyof typeof chartConfig].label}: {formattedValue}</span>
                        </div>
                    )
                }}
             />}
          />
          <Legend />
          <Bar dataKey="revenue" name="Faturamento" stackId="a" fill="var(--color-revenue)" radius={[4, 4, 0, 0]}/>
          <Bar dataKey="discounts" name="Descontos" stackId="a" fill="var(--color-discounts)" />
          <Bar dataKey="cmv" name="CMV" stackId="a" fill="var(--color-cmv)" />
          <Bar dataKey="shipping" name="Frete" stackId="a" fill="var(--color-shipping)" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
