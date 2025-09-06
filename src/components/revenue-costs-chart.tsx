
"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { format } from "date-fns";

interface RevenueCostsChartProps {
  title: string;
  data: {
    date: string;
    revenue: number;
    discounts: number;
    cmv: number;
    shipping: number;
  }[];
  dataKey: "revenue" | "discounts" | "cmv" | "shipping";
  color: string;
}

const chartConfig = {
  value: {
    label: "Valor",
  },
} satisfies ChartConfig;


export default function RevenueCostsChart({ title, data, dataKey, color }: RevenueCostsChartProps) {
  
  const chartData = React.useMemo(() => {
    return data.map(item => ({
        date: format(new Date(item.date), "dd/MM"),
        value: item[dataKey]
    }))
  }, [data, dataKey]);

  return (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
             <ChartContainer config={{...chartConfig, value: {...chartConfig.value, color } }} className="min-h-[200px] w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickCount={Math.min(10, chartData.length)}
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={80}
                    tickFormatter={(value) => {
                      if (typeof value !== 'number' || value === 0) return "R$ 0";
                      return new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(value);
                    }}
                  />
                  <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent
                        formatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value}
                        indicator="dot"
                     />}
                  />
                  <Area
                    dataKey="value"
                    type="natural"
                    fill={color}
                    fillOpacity={0.4}
                    stroke={color}
                    stackId="a"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
