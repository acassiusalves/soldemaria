"use client";

import * as React from "react";
import Link from "next/link";
import { addDays, format, parse, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Calendar as CalendarIcon,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
} from "lucide-react";

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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";
import DetailedSalesHistoryTable, { ColumnDef } from "@/components/detailed-sales-history-table";
import { detailedSalesData, type VendaDetalhada } from "@/lib/data";
import { SupportDataDialog } from "@/components/support-data-dialog";

// Mapeamento de chave para rótulo amigável
const columnLabels: Record<string, string> = {
  data: 'Data',
  codigo: 'Código',
  bandeira1: 'Bandeira',
  parcelas1: 'Parcelas',
  final: 'Valor Final',
  valorParcela1: 'Valor Parcela 1',
  taxaCartao1: 'Taxa Cartão 1',
  modoPagamento2: 'Modo Pgto. 2',
  parcelas2: 'Parcelas 2',
  bandeira2: 'Bandeira 2',
  valorParcela2: 'Valor Parcela 2',
  taxaCartao2: 'Taxa Cartão 2',
  custoFrete: 'Frete',
  imposto: 'Imposto',
  embalagem: 'Embalagem',
  comissao: 'Comissão',
};

const getLabel = (key: string) => columnLabels[key] || key;

export default function VendasPage() {
  const [sales, setSales] = React.useState(detailedSalesData);
  const [columns, setColumns] = React.useState<ColumnDef[]>(() => 
    Object.keys(detailedSalesData[0] || {})
      .map(key => ({ id: key, label: getLabel(key), isSortable: true }))
  );
  const [uploadedFileNames, setUploadedFileNames] = React.useState<string[]>([]);
  
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2025, 5, 1), // June 1, 2025
    to: addDays(new Date(2025, 7, 31), 0), // August 31, 2025
  });

  const filteredSales = React.useMemo(() => {
    if (!date?.from) return sales;
    const fromDate = date.from;
    const toDate = date.to ?? fromDate;

    return sales.filter((sale) => {
      const saleDate = parseISO(sale.data);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [date, sales]);

  const handleDataUpload = (data: VendaDetalhada[], fileNames: string[]) => {
    if (data.length > 0) {
      const firstRow = data[0];
      const newColumns = Object.keys(firstRow).map(key => ({
        id: key,
        label: getLabel(key),
        isSortable: true
      }));
      
      const uniqueNewColumns = newColumns.filter(newCol => !columns.some(existingCol => existingCol.id === newCol.id));
      if (uniqueNewColumns.length > 0) {
        setColumns(prev => [...prev, ...uniqueNewColumns]);
      }
    }
    
    const formattedData = data.map((item, index) => {
      let date = new Date().toISOString().split('T')[0]; // Default to today
      
      if(typeof item.data === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const jsDate = new Date(excelEpoch.getTime() + item.data * 24 * 60 * 60 * 1000);
        date = jsDate.toISOString().split('T')[0];
      } else if (typeof item.data === 'string') {
        try {
          if (!isNaN(parseISO(item.data).getTime())) {
             date = item.data;
          } else {
             const parsedDate = parse(item.data, 'dd/MM/yyyy', new Date());
             if(!isNaN(parsedDate.getTime())){
                date = parsedDate.toISOString().split('T')[0];
             }
          }
        } catch(e) {
          console.warn(`Could not parse date for row ${index}: ${item.data}`);
        }
      }

      return {
        ...item,
        id: `uploaded-${new Date().getTime()}-${index}`,
        data: date
      }
    });
    setSales(prev => [...prev, ...formattedData]);
    setUploadedFileNames(prev => [...prev, ...fileNames]);
  };

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
              <Link href="/">
                <SidebarMenuButton>
                  <LayoutDashboard />
                  Painel
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/vendas">
                <SidebarMenuButton isActive>
                  <ShoppingBag />
                  Vendas
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-h2 font-bold font-headline text-foreground/90">
              Vendas
            </h1>
          </div>
          <div className="flex items-center gap-4">
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
           <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="font-headline text-h3">Seleção de Período</CardTitle>
                  <CardDescription>
                    Filtre as vendas que você deseja analisar.
                  </CardDescription>
                </div>
                <SupportDataDialog onDataUpload={handleDataUpload} uploadedFileNames={uploadedFileNames}>
                   <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Dados de Apoio
                  </Button>
                </SupportDataDialog>
              </div>
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
                          {format(date.from, "dd/MM/y")} -{" "}
                          {format(date.to, "dd/MM/y")}
                        </>
                      ) : (
                        format(date.from, "dd/MM/y")
                      )
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
            </CardContent>
          </Card>
          <DetailedSalesHistoryTable data={filteredSales} columns={columns} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
