
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
import { endOfDay, format, isValid, parseISO, startOfMonth } from "date-fns";
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


const calculateChannelMetrics = (data: VendaDetalhada[]) => {
    const salesGroups = new Map<string, VendaDetalhada[]>();
    data.forEach(sale => {
        const code = normCode(sale.codigo);
        if (!salesGroups.has(code)) salesGroups.set(code, []);
        salesGroups.get(code)!.push(sale);
    });

    const channels: Record<string, { revenue: number, orders: number, items: number }> = {
        Delivery: { revenue: 0, orders: 0, items: 0 },
        Loja: { revenue: 0, orders: 0, items: 0 },
    };
    const origins: Record<string, number> = {};
    const logistics: Record<string, number> = {};
    const matrix: Record<string, Record<string, number>> = {};

    for (const [code, sales] of salesGroups.entries()) {
        let headerRow: any = {};
        let subRows = sales.filter(isDetailRow);
        if (subRows.length === 0 && sales.length > 0) subRows = sales;
        sales.forEach(row => headerRow = mergeForHeader(headerRow, row));
        
        const channel = /loja/i.test(headerRow.logistica || '') ? 'Loja' : 'Delivery';
        const origin = headerRow.origemCliente || 'N/A';

        const orderRevenue = subRows.reduce((acc, s) => acc + ((Number(s.final) || ((Number(s.valorUnitario) || 0) * (Number(s.quantidade) || 0))) - (Number(s.valorDescontos) || 0)), 0);
        const orderItems = subRows.reduce((acc, s) => acc + (Number(s.quantidade) || 0), 0);
        
        channels[channel].revenue += orderRevenue;
        channels[channel].orders += 1;
        channels[channel].items += orderItems;
        
        origins[origin] = (origins[origin] || 0) + orderRevenue;
        logistics[channel] = (logistics[channel] || 0) + orderRevenue;

        if (!matrix[origin]) matrix[origin] = {};
        matrix[origin][channel] = (matrix[origin][channel] || 0) + orderRevenue;
    }
    
    return {
        channels,
        originsChart: Object.entries(origins).map(([name, value]) => ({ name, current: value })),
        logisticsChart: Object.entries(logistics).map(([name, value]) => ({ name, current: value })),
        matrix,
    };
};

export default function CanaisEOrigensPage() {
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

    const { channels, originsChart, logisticsChart, matrix } = React.useMemo(
        () => calculateChannelMetrics(filteredData),
        [filteredData]
    );

    const deliveryKpis = {
        revenue: channels.Delivery.revenue,
        ticket: channels.Delivery.orders > 0 ? channels.Delivery.revenue / channels.Delivery.orders : 0,
        avgPrice: channels.Delivery.items > 0 ? channels.Delivery.revenue / channels.Delivery.items : 0,
        avgItems: channels.Delivery.orders > 0 ? channels.Delivery.items / channels.Delivery.orders : 0,
    };

    const storeKpis = {
        revenue: channels.Loja.revenue,
        ticket: channels.Loja.orders > 0 ? channels.Loja.revenue / channels.Loja.orders : 0,
        avgPrice: channels.Loja.items > 0 ? channels.Loja.revenue / channels.Loja.items : 0,
        avgItems: channels.Loja.orders > 0 ? channels.Loja.items / channels.Loja.orders : 0,
    };
    
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Análise de Canais & Origens</CardTitle>
          <CardDescription>
            Selecione o período para analisar a performance de seus canais de venda e origens de clientes.
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
      
       <div className="grid grid-cols-1 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Performance por Canal de Venda</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-semibold">Delivery</h3>
                    <div className="grid grid-cols-2 gap-4">
                         <KpiCard title="Faturamento" value={deliveryKpis.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<DollarSign/>} />
                         <KpiCard title="Ticket Médio" value={deliveryKpis.ticket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<ShoppingCart/>} />
                         <KpiCard title="Preço Médio/Item" value={deliveryKpis.avgPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<Tag/>} />
                         <KpiCard title="Itens/Pedido" value={deliveryKpis.avgItems.toFixed(2)} icon={<Package/>} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold">Loja</h3>
                    <div className="grid grid-cols-2 gap-4">
                         <KpiCard title="Faturamento" value={storeKpis.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<DollarSign/>} />
                         <KpiCard title="Ticket Médio" value={storeKpis.ticket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<ShoppingCart/>} />
                         <KpiCard title="Preço Médio/Item" value={storeKpis.avgPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={<Tag/>} />
                         <KpiCard title="Itens/Pedido" value={storeKpis.avgItems.toFixed(2)} icon={<Package/>} />
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
            <LogisticsChart data={logisticsChart} hasComparison={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <OriginChart data={originsChart} hasComparison={false} />
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
                  <ChannelOriginTable data={matrix} />
              </CardContent>
          </Card>
      </div>

    </div>
  );
}

