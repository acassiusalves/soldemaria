
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
    DollarSign,
    TrendingDown,
    Truck,
    Archive,
    Scale,
    Calendar as CalendarIcon,
} from "lucide-react";
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
import { eachDayOfInterval, endOfDay, format, isValid, parseISO, startOfMonth, subDays, differenceInDays, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import KpiCard from "@/components/kpi-card";
import RevenueCostsChart from "@/components/revenue-costs-chart";
import FinancialBreakdownTable, { BreakdownData } from "@/components/financial-breakdown-table";

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

const normCode = (v: any) => {
  let s = String(v ?? "").replace(/\u00A0/g, " ").trim();
  if (/^\d+(?:\.0+)?$/.test(s)) s = s.replace(/\.0+$/, "");
  s = s.replace(/[^\d]/g, "");
  s = s.replace(/^0+/, "");
  return s;
};

const isEmptyCell = (v: any) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") {
    const s = v.replace(/\u00A0/g, " ").trim().toLowerCase();
    return s === "" || s === "n/a" || s === "na" || s === "-" || s === "--";
  }
  return false;
};

const mergeForHeader = (base: any, row: any) => {
  let out = { ...base };
  const headerFields = [
    "data", "codigo", "tipo", "nomeCliente", "vendedor", "cidade",
    "origem", "origemCliente", "fidelizacao", "logistica", "final", "custoFrete",
  ];
  for (const k of headerFields) {
    if (isEmptyCell(out[k]) && !isEmptyCell(row[k])) {
      out[k] = row[k];
    }
  }
  return out;
};


const calculateFinancialMetrics = (
  currentData: VendaDetalhada[], 
  previousData: VendaDetalhada[], 
  dateRange?: DateRange
) => {
    const processDataSet = (data: VendaDetalhada[]) => {
      const salesGroups = new Map<string, VendaDetalhada[]>();
      data.forEach(sale => {
        const code = normCode(sale.codigo);
        if (!salesGroups.has(code)) salesGroups.set(code, []);
        salesGroups.get(code)!.push(sale);
      });

      let totalRevenue = 0;
      let totalDiscounts = 0;
      let totalCmv = 0;
      let totalShipping = 0;
      const byChannel: Record<string, BreakdownData> = {};
      const byOrigin: Record<string, BreakdownData> = {};
      const byDay: Record<string, { revenue: number, discounts: number, cmv: number, shipping: number }> = {};


      for (const [code, sales] of salesGroups.entries()) {
          let headerRow: any = {};
          sales.forEach(row => headerRow = mergeForHeader(headerRow, row));

          const isMultiLineOrder = sales.some(s => s.item || s.descricao);

          const revenue = isMultiLineOrder 
              ? sales.reduce((sum, item) => sum + (Number(item.final) || (Number(item.valorUnitario) * Number(item.quantidade)) || 0), 0)
              : Number(headerRow.final) || 0;

          const discounts = sales.reduce((sum, item) => sum + (Number(item.valorDescontos) || 0), 0);
          const cmv = sales.reduce((sum, item) => sum + (Number(item.custoUnitario) * Number(item.quantidade) || 0), 0);
          const shipping = Number(headerRow.custoFrete) || 0;
          const grossMargin = revenue - discounts - cmv - shipping;

          totalRevenue += revenue;
          totalDiscounts += discounts;
          totalCmv += cmv;
          totalShipping += shipping;
          
          const saleDate = toDate(headerRow.data);
          if (saleDate) {
              const dayKey = format(saleDate, "yyyy-MM-dd");
              if (!byDay[dayKey]) byDay[dayKey] = { revenue: 0, discounts: 0, cmv: 0, shipping: 0 };
              byDay[dayKey].revenue += revenue;
              byDay[dayKey].discounts += discounts;
              byDay[dayKey].cmv += cmv;
              byDay[dayKey].shipping += shipping;
          }

          const channel = headerRow.logistica || 'N/A';
          const origin = headerRow.origemCliente || 'N/A';

          if (!byChannel[channel]) byChannel[channel] = { name: channel, revenue: 0, discounts: 0, cmv: 0, shipping: 0, grossMargin: 0 };
          if (!byOrigin[origin]) byOrigin[origin] = { name: origin, revenue: 0, discounts: 0, cmv: 0, shipping: 0, grossMargin: 0 };
          
          byChannel[channel].revenue += revenue;
          byChannel[channel].discounts += discounts;
          byChannel[channel].cmv += cmv;
          byChannel[channel].shipping += shipping;
          byChannel[channel].grossMargin += grossMargin;
          
          byOrigin[origin].revenue += revenue;
          byOrigin[origin].discounts += discounts;
          byOrigin[origin].cmv += cmv;
          byOrigin[origin].shipping += shipping;
          byOrigin[origin].grossMargin += grossMargin;
      }

      return {
        totalRevenue, totalDiscounts, totalCmv, totalShipping,
        grossMargin: totalRevenue - totalDiscounts - totalCmv - totalShipping,
        byDay,
        byChannel: Object.values(byChannel),
        byOrigin: Object.values(byOrigin),
      };
    };

    const current = processDataSet(currentData);
    const previous = previousData.length > 0 ? processDataSet(previousData) : null;

    const calcChange = (currentVal: number, previousVal?: number) => {
        if (previousVal === undefined || previousVal === null) return 0;
        if (previousVal === 0) return currentVal > 0 ? Infinity : 0;
        return ((currentVal - previousVal) / previousVal) * 100;
    };
    
    const kpis = {
        totalRevenue: { value: current.totalRevenue, change: calcChange(current.totalRevenue, previous?.totalRevenue) },
        totalDiscounts: { value: current.totalDiscounts, change: calcChange(current.totalDiscounts, previous?.totalDiscounts) },
        totalCmv: { value: current.totalCmv, change: calcChange(current.totalCmv, previous?.totalCmv) },
        totalShipping: { value: current.totalShipping, change: calcChange(current.totalShipping, previous?.totalShipping) },
        grossMargin: { value: current.grossMargin, change: calcChange(current.grossMargin, previous?.grossMargin) },
    };

    const mergeBreakdownData = (currentBreakdown: BreakdownData[], previousBreakdown?: BreakdownData[]) => {
        const map = new Map<string, BreakdownData>();
        currentBreakdown.forEach(item => map.set(item.name, { ...item, previousRevenue: 0, previousGrossMargin: 0 }));
        
        if (previousBreakdown) {
            previousBreakdown.forEach(item => {
                if (map.has(item.name)) {
                    const existing = map.get(item.name)!;
                    existing.previousRevenue = item.revenue;
                    existing.previousGrossMargin = item.grossMargin;
                } else {
                    map.set(item.name, { ...item, revenue: 0, grossMargin: 0, discounts: 0, cmv: 0, shipping: 0, previousRevenue: item.revenue, previousGrossMargin: item.grossMargin });
                }
            });
        }
        return Array.from(map.values()).sort((a,b) => b.revenue - a.revenue);
    }
    
    const chartData = [];
    if (dateRange?.from) {
        const start = dateRange.from;
        const end = dateRange.to || dateRange.from;
        const days = eachDayOfInterval({ start, end });
        
        for(const currentDay of days) {
            const currentDayKey = format(currentDay, 'yyyy-MM-dd');
            const dayData = {
                date: currentDayKey,
                revenue: current.byDay[currentDayKey]?.revenue || 0,
                discounts: current.byDay[currentDayKey]?.discounts || 0,
                cmv: current.byDay[currentDayKey]?.cmv || 0,
                shipping: current.byDay[currentDayKey]?.shipping || 0,
            };

            if (previous) {
                const dayDiff = differenceInDays(end, start);
                const prevDay = subDays(currentDay, dayDiff + 1);
                const prevDayKey = format(prevDay, 'yyyy-MM-dd');
                const prevDayData = previous.byDay[prevDayKey];
                Object.assign(dayData, {
                    previousRevenue: prevDayData?.revenue || 0,
                    previousDiscounts: prevDayData?.discounts || 0,
                    previousCmv: prevDayData?.cmv || 0,
                    previousShipping: prevDayData?.shipping || 0,
                });
            }
            chartData.push(dayData);
        }
    }

    return {
        kpis,
        chartData,
        channelData: mergeBreakdownData(current.byChannel, previous?.byChannel),
        originData: mergeBreakdownData(current.byOrigin, previous?.byOrigin),
    };
};


export default function FinanceiroPage() {
  const today = new Date();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [compareDate, setCompareDate] = React.useState<DateRange | undefined>(undefined);

  const {
    data: allSales,
    isLoading: vendasLoading,
    refetch: refetchVendas,
    lastUpdated: vendasLastUpdated
  } = useSalesData(date?.from, date?.to || date?.from);

  const comparisonData = React.useMemo(() => {
    if (!compareDate?.from) return [];
    return allSales.filter((item) => {
      const itemDate = toDate(item.data);
      return itemDate && itemDate >= compareDate.from! && itemDate <= endOfDay(compareDate.to || compareDate.from!);
    });
  }, [allSales, compareDate]);
  
  const { kpis, chartData, channelData, originData } = React.useMemo(
    () => calculateFinancialMetrics(allSales, comparisonData, date),
    [allSales, comparisonData, date]
  );
  
  const hasComparison = !!compareDate;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Relatório Financeiro</CardTitle>
              <CardDescription>
                Selecione o período para analisar os indicadores financeiros do seu negócio.
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
                {date?.from ? (date.to ? (<>{format(date.from, "dd/MM/y", { locale: ptBR })} - {format(date.to, "dd/MM/y", { locale: ptBR })}</>) : (format(date.from, "dd/MM/y", { locale: ptBR }))) : (<span>Selecione uma data</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar 
                locale={ptBR} 
                initialFocus mode="range" 
                defaultMonth={date?.from} 
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KpiCard title="Faturamento Bruto" value={kpis.totalRevenue.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<DollarSign />} change={hasComparison ? `${kpis.totalRevenue.change.toFixed(2)}%` : undefined} changeType={kpis.totalRevenue.change >= 0 ? 'positive' : 'negative'} />
        <KpiCard title="Descontos" value={kpis.totalDiscounts.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<TrendingDown />} change={hasComparison ? `${kpis.totalDiscounts.change.toFixed(2)}%` : undefined} changeType={kpis.totalDiscounts.change >= 0 ? 'negative' : 'positive'} />
        <KpiCard title="CMV (Custo)" value={kpis.totalCmv.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<Archive />} change={hasComparison ? `${kpis.totalCmv.change.toFixed(2)}%` : undefined} changeType={kpis.totalCmv.change >= 0 ? 'negative' : 'positive'} />
        <KpiCard title="Frete" value={kpis.totalShipping.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<Truck />} change={hasComparison ? `${kpis.totalShipping.change.toFixed(2)}%` : undefined} changeType={kpis.totalShipping.change >= 0 ? 'negative' : 'positive'} />
        <KpiCard title="Margem Bruta" value={kpis.grossMargin.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<Scale />} change={hasComparison ? `${kpis.grossMargin.change.toFixed(2)}%` : undefined} changeType={kpis.grossMargin.change >= 0 ? 'positive' : 'negative'} />
      </div>

       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RevenueCostsChart title="Faturamento Bruto" data={chartData} dataKey="revenue" comparisonDataKey="previousRevenue" hasComparison={hasComparison} />
          <RevenueCostsChart title="Descontos" data={chartData} dataKey="discounts" comparisonDataKey="previousDiscounts" hasComparison={hasComparison} />
          <RevenueCostsChart title="CMV (Custo)" data={chartData} dataKey="cmv" comparisonDataKey="previousCmv" hasComparison={hasComparison} />
          <RevenueCostsChart title="Frete" data={chartData} dataKey="shipping" comparisonDataKey="previousShipping" hasComparison={hasComparison} />
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card>
            <CardHeader>
              <CardTitle>Análise Financeira por Canal de Venda</CardTitle>
            </CardHeader>
            <CardContent>
                <FinancialBreakdownTable data={channelData} hasComparison={hasComparison} />
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle>Análise Financeira por Origem do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
                <FinancialBreakdownTable data={originData} hasComparison={hasComparison} />
            </CardContent>
          </Card>
      </div>

    </div>
  );
}
