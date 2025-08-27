"use client";

import * as React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Venda } from "@/lib/data";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { parseISO } from "date-fns";

interface SalesChartProps {
  data: Venda[];
}

const chartConfig = {
  receita: {
    label: "Receita",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function SalesChart({ data }: SalesChartProps) {
  const monthlySales = React.useMemo(() => {
    const salesByMonth: { [key: string]: number } = {};
    data.forEach((sale) => {
      const month = parseISO(sale.data).toLocaleString("default", { month: "short" });
      salesByMonth[month] = (salesByMonth[month] || 0) + sale.receita;
    });

    const orderedMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    return orderedMonths
      .map(month => ({
        month,
        receita: salesByMonth[month] || 0,
      }))
      .filter(item => item.receita > 0);

  }, [data]);

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthlySales} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
             />}
          />
          <Bar
            dataKey="receita"
            fill="var(--color-receita)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
