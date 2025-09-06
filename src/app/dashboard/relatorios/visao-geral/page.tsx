
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DollarSign, ShoppingCart, Tag, Package } from "lucide-react";
import KpiCard from "@/components/kpi-card";
import LogisticsChart from "@/components/logistics-chart";
import OriginChart from "@/components/origin-chart";
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase";
import type { VendaDetalhada, Embalagem } from "@/lib/data";
import { DateRange } from "react-day-picker";
import { endOfDay, format, isValid, parseISO, startOfMonth, eachDayOfInterval } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";

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

const normalizeText = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();


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


export default function VisaoGeralPage() {
  const [allSales, setAllSales] = React.useState<VendaDetalhada[]>([]);
  const [logisticaData, setLogisticaData] = React.useState<VendaDetalhada[]>([]);
  const [custosEmbalagem, setCustosEmbalagem] = React.useState<Embalagem[]>([]);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  React.useEffect(() => {
    const unsubs: (() => void)[] = [];
    (async () => {
      const db = await getDbClient();
      if (!db) return;

      const collectionsToWatch = [
        { name: "vendas", setter: setAllSales },
        { name: "logistica", setter: setLogisticaData },
        { name: "custos-embalagem", setter: setCustosEmbalagem },
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


  const filteredData = React.useMemo(() => {
    if (!date?.from) return [];
    const fromDate = date.from;
    const toDateVal = date.to ? endOfDay(date.to) : endOfDay(fromDate);

    return consolidatedData.filter((item) => {
      const itemDate = toDate(item.data);
      return itemDate && itemDate >= fromDate && itemDate <= toDateVal;
    });
  }, [date, consolidatedData]);

  const { kpis, logisticsChartData, originChartData, originChartConfig } = React.useMemo(() => {
    const salesGroups = new Map<string, VendaDetalhada[]>();

    for (const sale of filteredData) {
      const code = normCode(sale.codigo);
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
    
    const salesByDayAndOrigin: Record<string, Record<string, number>> = {};
    const allOrigins = new Set<string>();

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
      if (headerRow.origemCliente) {
          origins[headerRow.origemCliente] = (origins[headerRow.origemCliente] || 0) + orderRevenue;
      }

      // For area chart
      const saleDate = toDate(headerRow.data);
      if(saleDate && headerRow.origemCliente) {
          const day = format(saleDate, "d");
          const origin = headerRow.origemCliente;
          allOrigins.add(origin);
          if(!salesByDayAndOrigin[day]) {
              salesByDayAndOrigin[day] = {};
          }
          salesByDayAndOrigin[day][origin] = (salesByDayAndOrigin[day][origin] || 0) + orderRevenue;
      }
    }
    
    const kpisResult = {
        totalRevenue: totalRevenue,
        averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        averagePrice: totalItems > 0 ? totalRevenue / totalItems : 0,
        averageItems: totalOrders > 0 ? totalItems / totalOrders : 0,
    };
    
    const logisticsChartData = Object.entries(logistics).map(([name, value]) => ({ name, value }));
    
    const originAreaChartData = [];
    const originColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    const tempOriginChartConfig: ChartConfig = {};
    Array.from(allOrigins).forEach((origin, index) => {
        tempOriginChartConfig[origin] = {
            label: origin,
            color: originColors[index % originColors.length],
        };
    });

    if (date?.from && date.to) {
        const interval = eachDayOfInterval({ start: date.from, end: date.to });
        for (const day of interval) {
            const dayKey = format(day, "d");
            const dayData: Record<string, any> = { day: dayKey };
            for(const origin of allOrigins) {
                dayData[origin] = salesByDayAndOrigin[dayKey]?.[origin] || 0;
            }
            originAreaChartData.push(dayData);
        }
    }

    return { kpis: kpisResult, logisticsChartData, originChartData: originAreaChartData, originChartConfig: tempOriginChartConfig };
  }, [filteredData, date]);


  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral (Executiva)</CardTitle>
          <CardDescription>
            Selecione o período para analisar os indicadores chave do seu negócio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "dd/MM/y", { locale: ptBR })} -{" "}
                      {format(date.to, "dd/MM/y", { locale: ptBR })}
                    </>
                  ) : (
                    format(date.from, "dd/MM/y", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                locale={ptBR}
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Faturamento Total"
          value={kpis.totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          change="+5.2% vs. mês anterior"
          icon={<DollarSign className="text-green-500" />}
        />
        <KpiCard
          title="Ticket Médio"
          value={kpis.averageTicket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          change="-1.8% vs. mês anterior"
          changeType="negative"
          icon={<ShoppingCart className="text-red-500" />}
        />
        <KpiCard
          title="Preço Médio por Item"
          value={kpis.averagePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          change="+2.1% vs. mês anterior"
          icon={<Tag className="text-green-500" />}
        />
         <KpiCard
          title="Itens por Pedido (Média)"
          value={kpis.averageItems.toFixed(2)}
          change="+0.5% vs. mês anterior"
          icon={<Package className="text-green-500" />}
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
            <LogisticsChart data={logisticsChartData} />
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
            <OriginChart data={originChartData} config={originChartConfig} />
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Vendas por Cidade (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Em breve: Gráfico de barras com as 10 cidades que mais geraram receita.</p>
                </div>
            </CardContent>
        </Card>
    </div>
    </div>
  );
}
