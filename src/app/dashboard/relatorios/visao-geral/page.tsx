
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
import type { VendaDetalhada } from "@/lib/data";
import { DateRange } from "react-day-picker";
import { endOfDay, format, isValid, parseISO, startOfMonth } from "date-fns";
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

export default function VisaoGeralPage() {
  const [allSales, setAllSales] = React.useState<VendaDetalhada[]>([]);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  React.useEffect(() => {
    const fetchSales = async () => {
      const db = await getDbClient();
      if (!db) return;
      const salesQuery = query(collection(db, "vendas"));
      const unsubscribe = onSnapshot(salesQuery, (snapshot) => {
        const salesData = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as VendaDetalhada)
        );
        setAllSales(salesData);
      });
      return unsubscribe;
    };

    fetchSales();
  }, []);

  const filteredData = React.useMemo(() => {
    if (!date?.from) return [];
    const fromDate = date.from;
    const toDateVal = date.to ? endOfDay(date.to) : endOfDay(fromDate);

    return allSales.filter((item) => {
      const itemDate = toDate(item.data);
      return itemDate && itemDate >= fromDate && itemDate <= toDateVal;
    });
  }, [date, allSales]);

  const { kpis, logisticsChartData, originChartData } = React.useMemo(() => {
    const salesGroups = new Map<string, VendaDetalhada[]>();

    for (const sale of filteredData) {
      const code = String(sale.codigo);
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
    
    for (const [code, sales] of salesGroups.entries()) {
      const orderRevenue = sales.reduce((acc, s) => acc + (Number(s.final) || 0) - (Number(s.valorDescontos) || 0), 0);
      const orderItems = sales.reduce((acc, s) => acc + (Number(s.quantidade) || 0), 0);
      const mainSale = sales[0];

      totalRevenue += orderRevenue;
      totalItems += orderItems;
      
      if (mainSale.logistica) {
          logistics[mainSale.logistica] = (logistics[mainSale.logistica] || 0) + orderRevenue;
      }
      if (mainSale.origem) {
          origins[mainSale.origem] = (origins[mainSale.origem] || 0) + orderRevenue;
      }
    }
    
    const kpisResult = {
        totalRevenue: totalRevenue,
        averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        averagePrice: totalItems > 0 ? totalRevenue / totalItems : 0,
        averageItems: totalOrders > 0 ? totalItems / totalOrders : 0,
    };
    
    const logisticsChartData = Object.entries(logistics).map(([name, value]) => ({ name, value }));
    const originChartData = Object.entries(origins).map(([name, value]) => ({ name, value }));

    return { kpis: kpisResult, logisticsChartData, originChartData };
  }, [filteredData]);


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
            <OriginChart data={originChartData} />
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
