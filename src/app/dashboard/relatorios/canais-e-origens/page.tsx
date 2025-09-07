
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
    ShoppingCart,
    Package,
    Tag,
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
import { endOfDay, format, isValid, parseISO, startOfMonth, differenceInDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import KpiCard from "@/components/kpi-card";
import OriginChart from "@/components/origin-chart";
import LogisticsChart from "@/components/logistics-chart";
import ChannelOriginTable from "@/components/channel-origin-table";

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

const isDetailRow = (row: Record<string, any>) =>
  !isEmptyCell(row.item) || !isEmptyCell(row.descricao);

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
  if (v instanceof Timestamp) return v.toDate().getTime();
  return 0;
};

const normStr = (s: any) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const pick = (obj: any, keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (!isEmptyCell(v)) return v;
  }
  return undefined;
};

const pickFromGroup = (rows: any[], keys: string[]) => {
  const headers = rows.filter(r => !isDetailRow(r));
  for (const r of headers) { const v = pick(r, keys); if (!isEmptyCell(v)) return v; }
  for (const r of rows)    { const v = pick(r, keys); if (!isEmptyCell(v)) return v; }
  return undefined;
};

const CODE_KEYS   = ["codigo","pedido","n_pedido","numero","num_pedido","id"];
const TIPO_KEYS   = ["tipo","tipo de venda","tipoVenda","Tipo","canal","canal_venda"];
const FINAL_KEYS  = ["final","valor final","valor_final","valorFinal","total","valor total","valor_total"];
const UNIT_KEYS   = ["valorUnitario","valor unitario","preco_unitario","preço unitário","preco","preço","unitario"];
const QTY_KEYS    = ["quantidade","qtd","qtde","qte","itens","itens_total"];
const ORIGIN_KEYS = ["origemCliente","origem","source"];

const calculateChannelMetrics = (data: VendaDetalhada[]) => {
  const salesGroups = new Map<string, VendaDetalhada[]>();

  data.forEach((row) => {
    const codeRaw = pick(row, CODE_KEYS);
    const code = normCode(codeRaw) || String((row as any).id || "");
    if (!code) return;
    if (!salesGroups.has(code)) salesGroups.set(code, []);
    salesGroups.get(code)!.push(row);
  });

  const channels: Record<string, { revenue: number; orders: number; items: number }> = {
    Delivery: { revenue: 0, orders: 0, items: 0 },
    Loja: { revenue: 0, orders: 0, items: 0 },
  };
  const origins: Record<string, number> = {};
  const logistics: Record<string, number> = {};
  const matrix: Record<string, Record<string, number>> = {};

  for (const [, rows] of salesGroups.entries()) {
    const detailRows = rows.filter(isDetailRow);

    const tipoRaw  = pickFromGroup(rows, TIPO_KEYS) ?? "";
    const tipoNorm = normStr(tipoRaw);
    const isLoja   = /(^|[\s\-_.])loja($|[\s\-_.])/.test(tipoNorm) || tipoNorm.includes("venda loja");
    const channel  = isLoja ? "Loja" : "Delivery";

    let orderRevenue = 0;
    let totalItems   = 0;

    if (isLoja) {
      const finalRaw = pickFromGroup(rows, FINAL_KEYS);
      orderRevenue   = numBR(finalRaw);
      totalItems     = numBR(pickFromGroup(rows, QTY_KEYS)) || (orderRevenue > 0 ? 1 : 0);
    } else {
      if (detailRows.length > 0) {
        for (const s of detailRows) {
          const qty  = numBR(pick(s, QTY_KEYS));
          const unit = numBR(pick(s, UNIT_KEYS));
          const line = (unit && qty) ? unit * qty : numBR(pick(s, FINAL_KEYS));
          orderRevenue += Math.max(0, line);
          totalItems   += qty || (line > 0 ? 1 : 0);
        }
      } else {
        orderRevenue = numBR(pickFromGroup(rows, FINAL_KEYS));
        totalItems   = numBR(pickFromGroup(rows, QTY_KEYS)) || (orderRevenue > 0 ? 1 : 0);
      }
    }

    orderRevenue = Math.max(0, orderRevenue);
    totalItems   = Math.max(0, totalItems);

    const origin = pickFromGroup(rows, ORIGIN_KEYS) ?? "N/A";

    channels[channel].revenue += orderRevenue;
    channels[channel].orders  += 1;
    channels[channel].items   += totalItems;

    if (orderRevenue > 0) {
      origins[origin]     = (origins[origin]     || 0) + orderRevenue;
      logistics[channel]  = (logistics[channel]  || 0) + orderRevenue;
      if (!matrix[origin]) matrix[origin] = {};
      matrix[origin][channel] = (matrix[origin][channel] || 0) + orderRevenue;
    }
  }

  return {
    channels,
    origins,
    logistics,
    matrix,
  };
};

export default function CanaisEOrigensPage() {
    const [allSales, setAllSales] = React.useState<VendaDetalhada[]>([]);
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
        if (date?.from && date?.to) {
            const diff = differenceInDays(date.to, date.from);
            setCompareDate({
                from: subDays(date.from, diff + 1),
                to: subDays(date.to, diff + 1),
            })
        }
    }, [date])

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

    const { filteredData, comparisonData } = React.useMemo(() => {
        const filterByDate = (data: VendaDetalhada[], dateRange: DateRange | undefined) => {
            if (!dateRange?.from) return [];
            return data.filter((item) => {
                const itemDate = toDate(item.data);
                return itemDate && itemDate >= dateRange.from! && itemDate <= endOfDay(dateRange.to || dateRange.from!);
            });
        };
        return {
            filteredData: filterByDate(allSales, date),
            comparisonData: filterByDate(allSales, compareDate),
        };
    }, [allSales, date, compareDate]);
    
    const { deliveryKpis, storeKpis, originsChart, logisticsChart, matrix, compareMatrix } = React.useMemo(() => {
        const currentMetrics = calculateChannelMetrics(filteredData);
        const previousMetrics = calculateChannelMetrics(comparisonData);

        const calcChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? Infinity : 0;
            return ((current - previous) / previous) * 100;
        };

        const createKpis = (channel: 'Delivery' | 'Loja') => {
            const current = currentMetrics.channels[channel];
            const previous = previousMetrics.channels[channel];
            return {
                revenue: { value: current.revenue, change: calcChange(current.revenue, previous.revenue) },
                ticket: { value: current.orders > 0 ? current.revenue / current.orders : 0, change: calcChange(current.orders > 0 ? current.revenue / current.orders : 0, previous.orders > 0 ? previous.revenue / previous.orders : 0) },
                avgPrice: { value: current.items > 0 ? current.revenue / current.items : 0, change: calcChange(current.items > 0 ? current.revenue / current.items : 0, previous.items > 0 ? previous.revenue / previous.items : 0) },
                avgItems: { value: current.orders > 0 ? current.items / current.orders : 0, change: calcChange(current.orders > 0 ? current.items / current.orders : 0, previous.orders > 0 ? previous.items / previous.orders : 0) },
            };
        };

        const allOriginsKeys = new Set([...Object.keys(currentMetrics.origins), ...Object.keys(previousMetrics.origins)]);
        const originsChartData = Array.from(allOriginsKeys).map(key => ({
            name: key,
            current: currentMetrics.origins[key] || 0,
            previous: previousMetrics.origins[key] || 0,
        }));

        const allLogisticsKeys = new Set([...Object.keys(currentMetrics.logistics), ...Object.keys(previousMetrics.logistics)]);
        const logisticsChartData = Array.from(allLogisticsKeys).map(key => ({
            name: key,
            current: currentMetrics.logistics[key] || 0,
            previous: previousMetrics.logistics[key] || 0,
        }));

        return {
            deliveryKpis: createKpis('Delivery'),
            storeKpis: createKpis('Loja'),
            originsChart: originsChartData,
            logisticsChart: logisticsChartData,
            matrix: currentMetrics.matrix,
            compareMatrix: previousMetrics.matrix,
        }

    }, [filteredData, comparisonData]);
    
    const hasComparison = !!compareDate;
    
    if (!mounted || !date) {
      return (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Canais &amp; Origens</CardTitle>
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
          <CardTitle>Análise de Canais &amp; Origens</CardTitle>
          <CardDescription>
            Selecione o período para analisar a performance de seus canais de venda e origens de clientes.
          </CardDescription>
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
        </CardContent>
      </Card>
      
       <div className="grid grid-cols-1 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Performance por Canal de Venda</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-semibold">Delivery</h3>
                    <div className="grid grid-cols-2 gap-4">
                         <KpiCard title="Faturamento" value={deliveryKpis.revenue.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<DollarSign/>} change={hasComparison ? `${deliveryKpis.revenue.change.toFixed(2)}%` : undefined} changeType={deliveryKpis.revenue.change >= 0 ? 'positive' : 'negative'} />
                         <KpiCard title="Ticket Médio" value={deliveryKpis.ticket.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<ShoppingCart/>} change={hasComparison ? `${deliveryKpis.ticket.change.toFixed(2)}%` : undefined} changeType={deliveryKpis.ticket.change >= 0 ? 'positive' : 'negative'} />
                         <KpiCard title="Preço Médio/Item" value={deliveryKpis.avgPrice.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<Tag/>} change={hasComparison ? `${deliveryKpis.avgPrice.change.toFixed(2)}%` : undefined} changeType={deliveryKpis.avgPrice.change >= 0 ? 'positive' : 'negative'} />
                         <KpiCard title="Itens/Pedido" value={deliveryKpis.avgItems.value.toFixed(2)} icon={<Package/>} change={hasComparison ? `${deliveryKpis.avgItems.change.toFixed(2)}%` : undefined} changeType={deliveryKpis.avgItems.change >= 0 ? 'positive' : 'negative'} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold">Loja</h3>
                    <div className="grid grid-cols-2 gap-4">
                         <KpiCard title="Faturamento" value={storeKpis.revenue.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<DollarSign/>} change={hasComparison ? `${storeKpis.revenue.change.toFixed(2)}%` : undefined} changeType={storeKpis.revenue.change >= 0 ? 'positive' : 'negative'} />
                         <KpiCard title="Ticket Médio" value={storeKpis.ticket.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<ShoppingCart/>} change={hasComparison ? `${storeKpis.ticket.change.toFixed(2)}%` : undefined} changeType={storeKpis.ticket.change >= 0 ? 'positive' : 'negative'} />
                         <KpiCard title="Preço Médio/Item" value={storeKpis.avgPrice.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<Tag/>} change={hasComparison ? `${storeKpis.avgPrice.change.toFixed(2)}%` : undefined} changeType={storeKpis.avgPrice.change >= 0 ? 'positive' : 'negative'} />
                         <KpiCard title="Itens/Pedido" value={storeKpis.avgItems.value.toFixed(2)} icon={<Package/>} change={hasComparison ? `${storeKpis.avgItems.change.toFixed(2)}%` : undefined} changeType={storeKpis.avgItems.change >= 0 ? 'positive' : 'negative'} />
                    </div>
                </div>
            </CardContent>
        </Card>
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <LogisticsChart data={logisticsChart} hasComparison={hasComparison} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <OriginChart data={originsChart} hasComparison={hasComparison} />
          </CardContent>
        </Card>
      </div>
      
       <div className="grid grid-cols-1 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle>Matriz Canal vs. Origem</CardTitle>
                   <CardDescription>
                      Cruzamento do faturamento por canal de venda e origem do cliente.
                    </CardDescription>
              </CardHeader>
              <CardContent>
                  <ChannelOriginTable data={matrix} compareData={compareMatrix} hasComparison={hasComparison} />
              </CardContent>
          </Card>
      </div>

    </div>
  );
}
