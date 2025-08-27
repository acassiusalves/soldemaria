"use client";

import * as React from "react";
import Link from "next/link";
import { addDays, format, parse, parseISO, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Calendar as CalendarIcon,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { collection, doc, onSnapshot, writeBatch, Timestamp } from "firebase/firestore";


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
import type { VendaDetalhada } from "@/lib/data";
import { SupportDataDialog } from "@/components/support-data-dialog";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";


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
  nomeCliente: 'Nome do Cliente',
};

const getLabel = (key: string) => columnLabels[key] || key;

const headerMapping: Record<string, string> = {
  'Data da Venda': 'data',
  'Código': 'codigo',
  'Cliente': 'nomeCliente',
  'Bandeira do Cartão': 'bandeira1',
  'Nº de Parcelas': 'parcelas1',
  'Valor Parcela': 'valorParcela1',
  'Taxa do Cartão': 'taxaCartao1',
  'Valor Final': 'final',
  'Modo de Pagamento 2': 'modoPagamento2',
  'Bandeira Cartão 2': 'bandeira2',
  'Nº de Parcelas 2': 'parcelas2',
  'Valor Parcela 2': 'valorParcela2',
  'Taxa Cartão 2': 'taxaCartao2',
  'Custo Frete': 'custoFrete',
  'Imposto': 'imposto',
  'Custo Embalagem': 'embalagem',
  'Comissão': 'comissao',
};

const cleanNumericValue = (value: any): number | string => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;

  const cleaned = value
    .replace('R$', '')      // Remove "R$"
    .replace(/\./g, '')     // Remove o ponto de milhar
    .replace(',', '.')      // Troca a vírgula do decimal por ponto
    .trim();                // Remove espaços

  const num = parseFloat(cleaned);
  return isNaN(num) ? value : num; // Se não for um número válido, retorna o original
};


export default function VendasPage() {
  const [sales, setSales] = React.useState<VendaDetalhada[]>([]);
  const [columns, setColumns] = React.useState<ColumnDef[]>([]);
  const [uploadedFileNames, setUploadedFileNames] = React.useState<string[]>([]);
  const { toast } = useToast();
  
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);

  // Listen for real-time updates from Firestore
  React.useEffect(() => {
    // Listen for sales data
    const salesUnsub = onSnapshot(collection(db, "vendas"), (snapshot) => {
        const salesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as VendaDetalhada));
        setSales(salesData);
    });

    // Listen for metadata (columns, uploaded files)
    const metaUnsub = onSnapshot(doc(db, "metadata", "vendas"), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setColumns(data.columns || []);
            setUploadedFileNames(data.uploadedFileNames || []);
        }
    });

    return () => {
        salesUnsub();
        metaUnsub();
    };
  }, []);

  const filteredSales = React.useMemo(() => {
    if (!date?.from) return sales;
    const fromDate = date.from;
    const toDate = date.to ? endOfDay(date.to) : endOfDay(fromDate);

    return sales.filter((sale) => {
      // Handle potential Timestamp from Firestore
      const saleDate = sale.data instanceof Timestamp ? sale.data.toDate() : (typeof sale.data === 'string' ? parseISO(sale.data) : sale.data);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [date, sales]);

  const handleDataUpload = async (raw_data: any[], fileNames: string[]) => {
    if (raw_data.length === 0) return;

    const mappedData = raw_data.map(row => {
        const newRow: any = {};
        for (const rawHeader in row) {
            const trimmedHeader = rawHeader.trim();
            const systemKey = headerMapping[trimmedHeader];

            if (systemKey) {
                newRow[systemKey] = cleanNumericValue(row[rawHeader]);
            } else {
                console.warn(`🟡 Cabeçalho não mapeado (do arquivo): "${trimmedHeader}"`);
            }
        }
        return newRow as VendaDetalhada;
    });

    try {
        const batch = writeBatch(db);

        // Update sales data
        mappedData.forEach((item, index) => {
            let date = new Date(); 
            
            if(typeof item.data === 'number') {
                const excelEpoch = new Date(1899, 11, 30);
                date = new Date(excelEpoch.getTime() + item.data * 24 * 60 * 60 * 1000);
            } else if (typeof item.data === 'string') {
                try {
                    let parsedDate = parseISO(item.data);
                    if (isNaN(parsedDate.getTime())) {
                        parsedDate = parse(item.data, 'dd/MM/yyyy', new Date());
                    }
                    if(!isNaN(parsedDate.getTime())){
                        date = parsedDate;
                    }
                } catch(e) {
                    console.warn(`Could not parse date for row ${index}: ${item.data}`);
                }
            } else if (item.data instanceof Date) {
              date = item.data;
            }
            
            const dateTimestamp = Timestamp.fromDate(date);
            const docId = `uploaded-${new Date().getTime()}-${index}`;
            const saleRef = doc(db, "vendas", docId);
            batch.set(saleRef, { ...item, id: docId, data: dateTimestamp });
        });

        // Update metadata
        const newColumns = [...columns];
        if (mappedData.length > 0) {
            const firstRow = mappedData[0];
            const detectedColumns = Object.keys(firstRow).map(key => ({
                id: key,
                label: getLabel(key),
                isSortable: true
            }));
            
            detectedColumns.forEach(newCol => {
                if (!newColumns.some(existingCol => existingCol.id === newCol.id)) {
                    newColumns.push(newCol);
                }
            });
        }
        
        const newUploadedFileNames = [...uploadedFileNames, ...fileNames];

        const metaRef = doc(db, "metadata", "vendas");
        batch.set(metaRef, { columns: newColumns, uploadedFileNames: newUploadedFileNames }, { merge: true });

        await batch.commit();

        toast({
            title: "Sucesso!",
            description: "Os dados foram salvos no banco de dados compartilhado.",
        });

    } catch (error) {
        console.error("Error uploading data to Firestore:", error);
        toast({
            title: "Erro ao Salvar",
            description: "Houve um problema ao salvar os dados. Tente novamente.",
            variant: "destructive",
        });
    }
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
