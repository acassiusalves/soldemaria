
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DollarSign, ShoppingCart, Tag, Package, Calendar as CalendarIcon } from "lucide-react";
import KpiCard from "@/components/kpi-card";
import LogisticsChart from "@/components/logistics-chart";
import OriginChart from "@/components/origin-chart";
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { VendaDetalhada, Embalagem } from "@/lib/data";
import { DateRange } from "react-day-picker";
import { endOfDay, format, isValid, parseISO, startOfMonth, differenceInDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import CitySalesTable from "@/components/city-sales-table";

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

const isDetailRow = (row: Record<string, any>) =>
  row.item || row.descricao;

const mergeForHeader = (base: any, row: any) => {
  let out = { ...base };
  const headerFields = [
    "data", "codigo", "tipo", "nomeCliente", "vendedor", "cidade",
    "origem", "origemCliente", "fidelizacao", "logistica", "final", "custoFrete",
  ];
  for (const k of headerFields) {
    if ((out[k] === null || out[k] === undefined || out[k] === '') && row[k]) {
      out[k] = row[k];
    }
  }
  return out;
};

const calculateMetrics = (data: VendaDetalhada[]) => {
    const salesGroups = new Map<string, VendaDetalhada[]>();

    for (const sale of data) {
      const code = normCode(sale.codigo);
      if (!code) continue;
      if (!salesGroups.has(code)) {
        salesGroups.set(code, []);
      }
      salesGroups.get(code)!.push(sale);
    }
    
    let totalRevenue = 0;
    let totalItems = 0;
    const totalOrders = salesGroups.size;
    const logistics: Record<string, number> = {};
    const origins: Record<string, number> = {};
    const cities: Record<string, number> = {};

    for (const [code, sales] of salesGroups.entries()) {
      let headerRow: any = {};
      let subRows = sales.filter(isDetailRow);
      if(subRows.length === 0 && sales.length > 0) subRows = sales;
      
      sales.forEach(row => headerRow = mergeForHeader(headerRow, row));
      
      const orderRevenue = subRows.reduce((acc, s) => acc + ((Number(s.final) || ((Number(s.valorUnitario) || 0) * (Number(s.quantidade) || 0))) - (Number(s.valorDescontos) || 0)), 0);
      const orderItems = subRows.reduce((acc, s) => acc + (Number(s.quantidade) || 0), 0);

      totalRevenue += orderRevenue;
      totalItems += orderItems;
      
      if (headerRow.logistica) {
          logistics[headerRow.logistica] = (logistics[headerRow.logistica] || 0) + orderRevenue;
      }
      
      const originKey = headerRow.origemCliente || 'Não Identificado';
      origins[originKey] = (origins[originKey] || 0) + orderRevenue;
      
      if (headerRow.cidade) {
        cities[headerRow.cidade] = (cities[headerRow.cidade] || 0) + orderRevenue;
      }
    }
    
    return {
        totalRevenue: totalRevenue,
        averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        averagePrice: totalItems > 0 ? totalRevenue / totalItems : 0,
        averageItems: totalOrders > 0 ? totalItems / totalOrders : 0,
        logistics,
        origins,
        cities,
    };
};

export default function VisaoGeralPage() {
  const [allSales, setAllSales] = React.useState<VendaDetalhada[]>([]);
  const [logisticaData, setLogisticaData] = React.useState<VendaDetalhada[]>([]);
  
  const [mounted, setMounted] = React.useState(false);
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);
  const [compareDate, setCompareDate] = React.useState<DateRange | undefined>(undefined);

  React.useEffect(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    const from = startOfMonth(today);
    setDate({ from, to: today });
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const unsubs: (() => void)[] = [];
    (async () => {
      const db = await getDbClient();
      if (!db) return;

      const collectionsToWatch = [
        { name: "vendas", setter: setAllSales },
        { name: "logistica", setter: setLogisticaData },
      ];

      collectionsToWatch.forEach(({ name, setter }) => {
        const q = query(collection(db, name));
        const unsub = onSnapshot(q, (snapshot) => {
          if (snapshot.metadata.hasPendingWrites) return;
          const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id })) as any[];
          setter(data);
        });
        unsubs.push(unsub);
      });
    })();
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const consolidatedData = React.useMemo(() => {
    const logisticaMap = new Map(logisticaData.map(l => [normCode(l.codigo), l]));
    return allSales.map(venda => {
        const code = normCode(venda.codigo);
        const logistica = logisticaMap.get(code);
        return {
            ...venda,
            ...(logistica && { logistica: logistica.logistica, entregador: logistica.entregador, valor: logistica.valor }),
        };
    });
  }, [allSales, logisticaData]);

  const { filteredData, comparisonData } = React.useMemo(() => {
    const filterByDate = (data: VendaDetalhada[], dateRange?: DateRange) => {
      if (!dateRange?.from) return [];
      const fromDate = dateRange.from;
      const toDateVal = dateRange.to ? endOfDay(dateRange.to) : endOfDay(fromDate);
      return data.filter((item) => {
        const itemDate = toDate(item.data);
        return itemDate && itemDate >= fromDate && itemDate <= toDateVal;
      });
    };
    return {
      filteredData: filterByDate(consolidatedData, date),
      comparisonData: filterByDate(consolidatedData, compareDate),
    };
  }, [consolidatedData, date, compareDate]);

  const { kpis, logisticsChartData, originChartData, citySalesData } = React.useMemo(() => {
    const currentMetrics = calculateMetrics(filteredData);
    const previousMetrics = comparisonData.length > 0 ? calculateMetrics(comparisonData) : null;

    const calcChange = (current: number, previous?: number) => {
        if (previous === undefined || previous === null) return 0;
        if (previous === 0) return current > 0 ? Infinity : 0;
        return ((current - previous) / previous) * 100;
    };
    
    const kpisResult = {
        totalRevenue: {
          value: currentMetrics.totalRevenue,
          change: calcChange(currentMetrics.totalRevenue, previousMetrics?.totalRevenue),
        },
        averageTicket: {
          value: currentMetrics.averageTicket,
          change: calcChange(currentMetrics.averageTicket, previousMetrics?.averageTicket),
        },
        averagePrice: {
          value: currentMetrics.averagePrice,
          change: calcChange(currentMetrics.averagePrice, previousMetrics?.averagePrice),
        },
        averageItems: {
          value: currentMetrics.averageItems,
          change: calcChange(currentMetrics.averageItems, previousMetrics?.averageItems),
        },
    };
    
    const allLogisticsKeys = new Set([...Object.keys(currentMetrics.logistics), ...Object.keys(previousMetrics?.logistics || {})]);
    const logisticsChartData = Array.from(allLogisticsKeys).map(key => ({
        name: key,
        current: currentMetrics.logistics[key] || 0,
        previous: previousMetrics?.logistics[key] || 0,
    }));

    const allOriginsKeys = new Set([...Object.keys(currentMetrics.origins), ...Object.keys(previousMetrics?.origins || {})]);
    const originChartData = Array.from(allOriginsKeys).map(key => ({
        name: key,
        current: currentMetrics.origins[key] || 0,
        previous: previousMetrics?.origins[key] || 0,
    }));

    const allCitiesKeys = new Set([...Object.keys(currentMetrics.cities), ...Object.keys(previousMetrics?.cities || {})]);
    const citySalesData = Array.from(allCitiesKeys).map(name => {
        const revenue = currentMetrics.cities[name] || 0;
        const previousRevenue = previousMetrics?.cities[name] || 0;
        return {
            name,
            revenue,
            previousRevenue,
            percentage: currentMetrics.totalRevenue > 0 ? (revenue / currentMetrics.totalRevenue) * 100 : 0,
            change: calcChange(revenue, previousRevenue),
        }
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return { kpis: kpisResult, logisticsChartData, originChartData, citySalesData };
  }, [filteredData, comparisonData]);

  const hasComparison = !!compareDate;

  if (!mounted || !date) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral (Executiva)</CardTitle>
            <CardDescription>Carregando…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral (Executiva)</CardTitle>
          <CardDescription>
            Selecione o período para analisar os indicadores chave do seu negócio.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal",!date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span suppressHydrationWarning>
                    {date.to ? (<>{format(date.from, "dd/MM/y", { locale: ptBR })} - {format(date.to, "dd/MM/y", { locale: ptBR })}</>) : (format(date.from, "dd/MM/y", { locale: ptBR }))}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar locale={ptBR} initialFocus mode="range" defaultMonth={date.from} selected={date} onSelect={setDate} numberOfMonths={2} />
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
              <Calendar locale={ptBR} initialFocus mode="range" defaultMonth={compareDate?.from} selected={compareDate} onSelect={setCompareDate} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
          {hasComparison && (
            <Button variant="ghost" onClick={() => setCompareDate(undefined)}>Limpar Comparação</Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Faturamento Total"
          value={kpis.totalRevenue.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          change={hasComparison ? `${kpis.totalRevenue.change.toFixed(2)}%` : undefined}
          changeType={kpis.totalRevenue.change >= 0 ? 'positive' : 'negative'}
          icon={<DollarSign />}
        />
        <KpiCard
          title="Ticket Médio"
          value={kpis.averageTicket.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          change={hasComparison ? `${kpis.averageTicket.change.toFixed(2)}%` : undefined}
          changeType={kpis.averageTicket.change >= 0 ? 'positive' : 'negative'}
          icon={<ShoppingCart />}
        />
        <KpiCard
          title="Preço Médio por Item"
          value={kpis.averagePrice.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          change={hasComparison ? `${kpis.averagePrice.change.toFixed(2)}%` : undefined}
          changeType={kpis.averagePrice.change >= 0 ? 'positive' : 'negative'}
          icon={<Tag />}
        />
         <KpiCard
          title="Itens por Pedido (Média)"
          value={kpis.averageItems.value.toFixed(2)}
          change={hasComparison ? `${kpis.averageItems.change.toFixed(2)}%` : undefined}
          changeType={kpis.averageItems.change >= 0 ? 'positive' : 'negative'}
          icon={<Package />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Canal</CardTitle>
            <CardDescription>
              Performance de receita dos canais de venda (Delivery vs. Loja).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LogisticsChart data={logisticsChartData} hasComparison={hasComparison} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Origem</CardTitle>
            <CardDescription>
              Contribuição de cada canal de aquisição para a receita.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OriginChart data={originChartData} hasComparison={hasComparison} />
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle>Vendas por Cidade (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                  <CitySalesTable data={citySalesData} hasComparison={hasComparison} />
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
