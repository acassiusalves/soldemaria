
"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface TopProductsChartProps {
  data: { name: string; quantity: number }[];
}

const chartConfig = {
  quantity: {
    label: "Quantidade",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function TopProductsChart({ data }: TopProductsChartProps) {
  const reversedData = React.useMemo(() => [...data].reverse(), [data]);

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={reversedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={150}
            tickFormatter={(value) =>
              value.length > 20 ? `${value.substring(0, 20)}...` : value
            }
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--accent))" }}
            content={<ChartTooltipContent />}
          />
          <Bar
            dataKey="quantity"
            fill="var(--color-quantity)"
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="quantity"
              position="right"
              offset={8}
              className="fill-foreground"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
