
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
import { DateRange } from "react-day-picker";
import { eachDayOfInterval, endOfDay, format, isValid, parseISO, startOfMonth } from "date-fns";
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


const calculateFinancialMetrics = (data: VendaDetalhada[], dateRange?: DateRange) => {
    const salesGroups = new Map<string, VendaDetalhada[]>();

    for (const sale of data) {
      const code = normCode(sale.codigo);
      if (!salesGroups.has(code)) salesGroups.set(code, []);
      salesGroups.get(code)!.push(sale);
    }

    let totalRevenue = 0;
    let totalDiscounts = 0;
    let totalCmv = 0;
    let totalShipping = 0;
    
    const byChannel: Record<string, BreakdownData> = {};
    const byOrigin: Record<string, BreakdownData> = {};
    const byDay: Record<string, { date: string, revenue: number, discounts: number, cmv: number, shipping: number }> = {};
    
    if (dateRange?.from) {
        const start = dateRange.from;
        const end = dateRange.to || dateRange.from;
        const days = eachDayOfInterval({ start, end });
        days.forEach(day => {
            const dayKey = format(day, "yyyy-MM-dd");
            byDay[dayKey] = { date: dayKey, revenue: 0, discounts: 0, cmv: 0, shipping: 0 };
        })
    }


    for (const [code, sales] of salesGroups.entries()) {
        const headerRow = sales.reduce((acc, row) => ({...acc, ...row}), {} as VendaDetalhada);
        
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
            if (byDay[dayKey]) {
                byDay[dayKey].revenue += revenue;
                byDay[dayKey].discounts += discounts;
                byDay[dayKey].cmv += cmv;
                byDay[dayKey].shipping += shipping;
            }
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
    
    const chartData = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    
    const kpis = {
        totalRevenue: { value: totalRevenue },
        totalDiscounts: { value: totalDiscounts },
        totalCmv: { value: totalCmv },
        totalShipping: { value: totalShipping },
        grossMargin: { value: totalRevenue - totalDiscounts - totalCmv - totalShipping },
    };

    return {
        kpis,
        chartData,
        channelData: Object.values(byChannel).sort((a,b) => b.revenue - a.revenue),
        originData: Object.values(byOrigin).sort((a,b) => b.revenue - a.revenue),
    };
};


export default function FinanceiroPage() {
  const [allSales, setAllSales] = React.useState<VendaDetalhada[]>([]);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  React.useEffect(() => {
    let unsub: () => void;
    (async () => {
      const db = await getDbClient();
      if (!db) return;

      const q = query(collection(db, "vendas"));
      unsub = onSnapshot(q, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;
        setAllSales(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })) as VendaDetalhada[]);
      });
    })();
    return () => unsub && unsub();
  }, []);

  const filteredData = React.useMemo(() => {
    if (!date?.from) return [];
    return allSales.filter((item) => {
      const itemDate = toDate(item.data);
      return itemDate && itemDate >= date.from! && itemDate <= endOfDay(date.to || date.from!);
    });
  }, [allSales, date]);
  
  const { kpis, chartData, channelData, originData } = React.useMemo(
    () => calculateFinancialMetrics(filteredData, date),
    [filteredData, date]
  );
  
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório Financeiro</CardTitle>
          <CardDescription>
            Selecione o período para analisar os indicadores financeiros do seu negócio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (date.to ? (<>{format(date.from, "dd/MM/y", { locale: ptBR })} - {format(date.to, "dd/MM/y", { locale: ptBR })}</>) : (format(date.from, "dd/MM/y", { locale: ptBR }))) : (<span>Selecione uma data</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar locale={ptBR} initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KpiCard title="Faturamento Bruto" value={kpis.totalRevenue.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<DollarSign />} />
        <KpiCard title="Descontos" value={kpis.totalDiscounts.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<TrendingDown />} />
        <KpiCard title="CMV (Custo)" value={kpis.totalCmv.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<Archive />} />
        <KpiCard title="Frete" value={kpis.totalShipping.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<Truck />} />
        <KpiCard title="Margem Bruta" value={kpis.grossMargin.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<Scale />} />
      </div>

       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RevenueCostsChart title="Faturamento Bruto" data={chartData} dataKey="revenue" color="hsl(var(--chart-2))" />
          <RevenueCostsChart title="Descontos" data={chartData} dataKey="discounts" color="hsl(var(--chart-3))" />
          <RevenueCostsChart title="CMV (Custo)" data={chartData} dataKey="cmv" color="hsl(var(--chart-4))" />
          <RevenueCostsChart title="Frete" data={chartData} dataKey="shipping" color="hsl(var(--chart-5))" />
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card>
            <CardHeader>
              <CardTitle>Análise Financeira por Canal de Venda</CardTitle>
            </CardHeader>
            <CardContent>
                <FinancialBreakdownTable data={channelData} />
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle>Análise Financeira por Origem do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
                <FinancialBreakdownTable data={originData} />
            </CardContent>
          </Card>
      </div>

    </div>
  );
}
