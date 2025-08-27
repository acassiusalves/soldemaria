"use client";

import * as React from "react";
import Image from "next/image";
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Calendar as CalendarIcon,
  DollarSign,
  History,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Settings,
  ShoppingBag,
  Trophy,
} from "lucide-react";

import { salesData, type Venda } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";
import KpiCard from "@/components/kpi-card";
import SalesChart from "@/components/sales-chart";
import InsightsGenerator from "@/components/insights-generator";
import SalesHistoryTable from "@/components/sales-history-table";

export default function DashboardPage() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2023, 0, 1),
    to: addDays(new Date(2023, 11, 31), 0),
  });

  const filteredSales = React.useMemo(() => {
    if (!date?.from) return salesData;
    const fromDate = date.from;
    const toDate = date.to ?? fromDate;

    return salesData.filter((sale) => {
      const saleDate = new Date(sale.data);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [date]);

  const totalRevenue = React.useMemo(() => 
    filteredSales.reduce((sum, sale) => sum + sale.receita, 0)
  , [filteredSales]);

  const totalSales = React.useMemo(() => 
    filteredSales.reduce((sum, sale) => sum + sale.unidadesVendidas, 0)
  , [filteredSales]);

  const salesByCategory = React.useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      acc[sale.categoria] = (acc[sale.categoria] || 0) + sale.receita;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredSales]);

  const topCategory = React.useMemo(() => {
    return Object.entries(salesByCategory).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
  }, [salesByCategory]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-8 text-primary" />
            <span className="text-xl font-semibold font-headline">Visão de Vendas</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive>
                <LayoutDashboard />
                Painel
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <History />
                Histórico
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-2xl font-semibold font-headline text-foreground/90">
              Painel de Controle
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn("grid gap-2")}>
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
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="https://picsum.photos/100/100" data-ai-hint="person" alt="@usuario" />
                    <AvatarFallback>UV</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Usuário Visão</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      usuario@visao.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Receita Total"
              value={totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL"})}
              change="+20.1% do último mês"
              icon={<DollarSign className="text-primary" />}
            />
            <KpiCard
              title="Vendas"
              value={`+${totalSales.toLocaleString("pt-BR")}`}
              change="+180.1% do último mês"
              icon={<ShoppingBag className="text-primary" />}
            />
            <KpiCard
              title="Ticket Médio"
              value={(totalRevenue / totalSales || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL"})}
              change="-2.1% do último mês"
              changeType="negative"
              icon={<DollarSign className="text-primary" />}
            />
            <KpiCard
              title="Categoria Destaque"
              value={topCategory[0]}
              change={`${(topCategory[1] / totalRevenue * 100 || 0).toFixed(1)}% do total`}
              icon={<Trophy className="text-primary" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-headline">Visão Geral das Vendas</CardTitle>
                <CardDescription>
                  Receita por mês no período selecionado.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <SalesChart data={filteredSales} />
              </CardContent>
            </Card>
            <InsightsGenerator data={filteredSales} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Histórico de Vendas</CardTitle>
              <CardDescription>
                Uma lista detalhada das vendas recentes na sua loja.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesHistoryTable data={filteredSales} />
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
