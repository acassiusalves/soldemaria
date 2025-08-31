

"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  ArrowDownRight,
  ArrowUpRight,
  Box,
  Calendar as CalendarIcon,
  ChevronDown,
  DollarSign,
  History,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Percent,
  Plug,
  Settings,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";


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
import { Logo } from "@/components/icons";
import KpiCard from "@/components/kpi-card";
import SalesHistoryTable from "@/components/sales-history-table";
import TopProductsChart from "@/components/top-products-chart";
import OriginChart from "@/components/origin-chart";

export default function DashboardPage() {
    const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2023, 0, 1),
    to: addDays(new Date(2023, 11, 31), 0),
  });
    const router = useRouter();


  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const filteredSales = React.useMemo(() => {
    if (!date?.from) return salesData;
    const fromDate = date.from;
    const toDate = date.to ?? fromDate;

    return salesData.filter((sale) => {
      try {
        const saleDate = parseISO(sale.data);
        return saleDate >= fromDate && saleDate <= toDate;
      } catch (e) {
        return false;
      }
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
    if (Object.keys(salesByCategory).length === 0) return ["N/A", 0];
    return Object.entries(salesByCategory).sort((a, b) => b[1] - a[1])[0];
  }, [salesByCategory]);

  const topProducts = React.useMemo(() => {
    const productQuantities: Record<string, number> = {};
    filteredSales.forEach(sale => {
        productQuantities[sale.produto] = (productQuantities[sale.produto] || 0) + sale.unidadesVendidas;
    });

    return Object.entries(productQuantities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, quantity]) => ({ name, quantity }));
  }, [filteredSales]);
  
  const salesByOrigin = React.useMemo(() => {
    const originMap: Record<string, number> = {};
    filteredSales.forEach(sale => {
        const origin = 'Loja Física';
        originMap[origin] = (originMap[origin] || 0) + sale.receita;
    });
    return Object.entries(originMap).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  const displayDate = date ?? {
    from: new Date(2023, 0, 1),
    to: addDays(new Date(2023, 11, 31), 0),
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <Logo className="size-8 text-primary" />
            <span className="text-xl font-semibold font-headline">Visão de Vendas</span>
          </Link>
          <Link
            href="/"
            className="text-foreground transition-colors hover:text-foreground"
          >
            Painel
          </Link>
          <Link
            href="/vendas"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Vendas
          </Link>
          <Link
            href="/logistica"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Logística
          </Link>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground data-[state=open]:bg-accent px-3">
                Taxas
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/taxas/cartao">Taxas do Cartão</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/taxas/custos">Custos sobre Vendas</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href="/conexoes"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Conexões
          </Link>
        </nav>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex items-center gap-4">
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
                        {displayDate?.from ? (
                          displayDate.to ? (
                            <>
                              {format(displayDate.from, "LLL dd, y")} -{" "}
                              {format(displayDate.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(displayDate.from, "LLL dd, y")
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
                        defaultMonth={displayDate?.from}
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
                        <p className="text-sm font-medium leading-none">{auth.currentUser?.displayName || 'Usuário Visão'}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {auth.currentUser?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
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
              <CardTitle className="font-headline text-h3">Top 10 Produtos Mais Vendidos</CardTitle>
              <CardDescription>
                Produtos com maior quantidade de vendas no período selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <TopProductsChart data={topProducts} />
            </CardContent>
          </Card>
          <Card>
             <CardHeader>
                <CardTitle className="font-headline text-h3">Comparativo por Origem</CardTitle>
                <CardDescription>
                    Distribuição da receita por canal de venda no período.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <OriginChart data={salesByOrigin} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-h3">Histórico de Vendas</CardTitle>
            <CardDescription>
              Uma lista detalhada das vendas recentes na sua loja.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesHistoryTable data={filteredSales} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
