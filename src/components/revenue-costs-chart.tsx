
"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
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
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
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
                formatter={(value, name, item) => {
                    const dataKey = item.dataKey as keyof typeof chartConfig;
                    const config = chartConfig[dataKey];
                    const formattedValue = typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value;
                    if (!config) return null;
                    return (
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{backgroundColor: config.color}}/>
                           <span>{config.label}: {formattedValue}</span>
                        </div>
                    )
                }}
             />}
          />
          <Legend />
          <Area type="monotone" dataKey="revenue" stackId="1" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.4} name="Faturamento"/>
          <Area type="monotone" dataKey="discounts" stackId="1" stroke="var(--color-discounts)" fill="var(--color-discounts)" fillOpacity={0.4} name="Descontos"/>
          <Area type="monotone" dataKey="cmv" stackId="1" stroke="var(--color-cmv)" fill="var(--color-cmv)" fillOpacity={0.4} name="CMV"/>
          <Area type="monotone" dataKey="shipping" stackId="1" stroke="var(--color-shipping)" fill="var(--color-shipping)" fillOpacity={0.4} name="Frete"/>
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
