
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
    collection,
    onSnapshot,
    query,
    Timestamp,
} from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { VendaDetalhada } from "@/lib/data";
import { useSalesData } from "@/hooks/use-firestore-data-v2";
import { RefreshButton } from "@/components/refresh-button";
import { DateRange } from "react-day-picker";
import { endOfDay, format, isValid, parseISO, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import ProductPerformanceTable from "@/components/product-performance-table";
import AbcCurveChart from "@/components/abc-curve-chart";

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string") {
    const d = parseISO(value);
    if (isValid(d)) return d;
  }
  return null;
};

const numBR = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v
      .replace(/\u00A0/g, " ")
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const calculateProductMetrics = (data: VendaDetalhada[]) => {
    const products: Record<string, { revenue: number; quantity: number; orders: Set<string> }> = {};

    data.forEach(sale => {
        const productName = sale.descricao?.trim();
        if (!productName) return;

        const revenue = numBR(sale.final) || (numBR(sale.valorUnitario) * numBR(sale.quantidade));
        const quantity = numBR(sale.quantidade);

        if (!products[productName]) {
            products[productName] = { revenue: 0, quantity: 0, orders: new Set() };
        }
        products[productName].revenue += revenue;
        products[productName].quantity += quantity;
        products[productName].orders.add(String(sale.codigo));
    });

    const totalRevenue = Object.values(products).reduce((sum, p) => sum + p.revenue, 0);
    
    const sortedProducts = Object.entries(products).map(([name, metrics]) => ({
        name,
        revenue: metrics.revenue,
        quantity: metrics.quantity,
        orders: metrics.orders.size,
        averagePrice: metrics.quantity > 0 ? metrics.revenue / metrics.quantity : 0,
        share: totalRevenue > 0 ? (metrics.revenue / totalRevenue) * 100 : 0,
    })).sort((a,b) => b.revenue - a.revenue);

    let cumulativeRevenue = 0;
    const abcData = sortedProducts.map(p => {
        cumulativeRevenue += p.revenue;
        const cumulativePercentage = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0;
        
        let abcClass: 'A' | 'B' | 'C' = 'C';
        if (cumulativePercentage <= 80) {
            abcClass = 'A';
        } else if (cumulativePercentage <= 95) {
            abcClass = 'B';
        }
        
        return {
            ...p,
            cumulativePercentage,
            class: abcClass,
        }
    });

    return {
        tableData: abcData,
        abcChartData: abcData,
    };
};


export default function ProdutosPage() {
    const [mounted, setMounted] = React.useState(false);
    const today = new Date();
    const [date, setDate] = React.useState<DateRange | undefined>({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });
    const [compareDate, setCompareDate] = React.useState<DateRange | undefined>(undefined);

    const {
      data: allSales,
      isLoading: vendasLoading,
      refetch: refetchVendas,
      lastUpdated: vendasLastUpdated
    } = useSalesData(date?.from, date?.to || date?.from);

    React.useEffect(() => {
      setMounted(true);
    }, []);

     const comparisonData = React.useMemo(() => {
        if (!compareDate?.from) return [];
        return allSales.filter((item) => {
            const itemDate = toDate(item.data);
            return itemDate && itemDate >= compareDate.from! && itemDate <= endOfDay(compareDate.to || compareDate.from!);
        });
    }, [allSales, compareDate]);

    const { tableData, abcChartData } = React.useMemo(() => {
        const { tableData: currentMetrics, abcChartData: currentAbcData } = calculateProductMetrics(allSales);
        if (!compareDate) {
            return { tableData: currentMetrics, abcChartData: currentAbcData };
        }
        const { tableData: previousMetrics } = calculateProductMetrics(comparisonData);
        const previousMetricsMap = new Map(previousMetrics.map(p => [p.name, p]));

        const combinedTableData = currentMetrics.map(currentProduct => ({
            ...currentProduct,
            previousRevenue: previousMetricsMap.get(currentProduct.name)?.revenue,
        }));

        return { tableData: combinedTableData, abcChartData: currentAbcData };
    }, [allSales, comparisonData, compareDate]);
    
    const hasComparison = !!compareDate;

    if (!mounted || !date) {
      return (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Produtos</CardTitle>
              <CardDescription>Carregando…</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }
  
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Relatório de Produtos</CardTitle>
              <CardDescription>
                Selecione o período para analisar a performance dos seus produtos.
              </CardDescription>
            </div>
            <RefreshButton
              onRefresh={refetchVendas}
              isLoading={vendasLoading}
              lastUpdated={vendasLastUpdated}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
             <Popover>
                <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span suppressHydrationWarning>
                    {date.to
                        ? `${format(date.from!, "dd/MM/y", { locale: ptBR })} - ${format(date.to!, "dd/MM/y", { locale: ptBR })}`
                        : format(date.from!, "dd/MM/y", { locale: ptBR })}
                    </span>
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  locale={ptBR} 
                  initialFocus mode="range" 
                  defaultMonth={date.from} 
                  selected={date} 
                  onSelect={setDate} 
                  numberOfMonths={2}
                  presets={[
                    { label: 'Hoje', range: { from: today, to: today } },
                    { label: 'Ontem', range: { from: subDays(today, 1), to: subDays(today, 1) } },
                    { label: 'Hoje e ontem', range: { from: subDays(today, 1), to: today } },
                    { label: 'Últimos 7 dias', range: { from: subDays(today, 6), to: today } },
                    { label: 'Últimos 14 dias', range: { from: subDays(today, 13), to: today } },
                    { label: 'Últimos 28 dias', range: { from: subDays(today, 27), to: today } },
                    { label: 'Últimos 30 dias', range: { from: subDays(today, 29), to: today } },
                    { label: 'Esta semana', range: { from: startOfWeek(today), to: endOfWeek(today) } },
                    { label: 'Semana passada', range: { from: startOfWeek(subDays(today, 7)), to: endOfWeek(subDays(today, 7)) } },
                    { label: 'Este mês', range: { from: startOfMonth(today), to: endOfMonth(today) } },
                    { label: 'Mês passado', range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) } },
                    { label: 'Máximo', range: { from: new Date(2023, 0, 1), to: today } },
                ]}
                />
                </PopoverContent>
            </Popover>
             <Popover>
                <PopoverTrigger asChild>
                <Button id="compareDate" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !compareDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {compareDate?.from ? (compareDate.to ? (<>{format(compareDate.from, "dd/MM/y", { locale: ptBR })} - {format(compareDate.to, "dd/MM/y", { locale: ptBR })}</>) : (format(compareDate.from, "dd/MM/y", { locale: ptBR }))) : (<span>Comparar com...</span>)}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  locale={ptBR} 
                  initialFocus mode="range" 
                  defaultMonth={compareDate?.from} 
                  selected={compareDate} 
                  onSelect={setCompareDate} 
                  numberOfMonths={2} 
                  presets={[
                    { label: 'Hoje', range: { from: today, to: today } },
                    { label: 'Ontem', range: { from: subDays(today, 1), to: subDays(today, 1) } },
                    { label: 'Hoje e ontem', range: { from: subDays(today, 1), to: today } },
                    { label: 'Últimos 7 dias', range: { from: subDays(today, 6), to: today } },
                    { label: 'Últimos 14 dias', range: { from: subDays(today, 13), to: today } },
                    { label: 'Últimos 28 dias', range: { from: subDays(today, 27), to: today } },
                    { label: 'Últimos 30 dias', range: { from: subDays(today, 29), to: today } },
                    { label: 'Esta semana', range: { from: startOfWeek(today), to: endOfWeek(today) } },
                    { label: 'Semana passada', range: { from: startOfWeek(subDays(today, 7)), to: endOfWeek(subDays(today, 7)) } },
                    { label: 'Este mês', range: { from: startOfMonth(today), to: endOfMonth(today) } },
                    { label: 'Mês passado', range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) } },
                    { label: 'Máximo', range: { from: new Date(2023, 0, 1), to: today } },
                ]}
                />
                </PopoverContent>
            </Popover>
            {hasComparison && (
              <Button variant="ghost" onClick={() => setCompareDate(undefined)}>Limpar Comparação</Button>
            )}
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Curva ABC de Produtos</CardTitle>
           <CardDescription>
            Análise de Pareto para classificar produtos com base na sua contribuição para o faturamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <AbcCurveChart data={abcChartData} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Performance por Produto</CardTitle>
        </CardHeader>
        <CardContent>
            <ProductPerformanceTable data={tableData} hasComparison={hasComparison}/>
        </CardContent>
      </Card>
    </div>
  );
}
