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


// utils: normaliza cabeçalhos p/ comparação robusta
const normalizeHeader = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')  // remove acentos
    .replace(/[^\w\s]/g, '')                          // remove pontuação (., /, etc.)
    .replace(/\s+/g, ' ')                             // colapsa espaços
    .trim();

// Mapeamento de chave para rótulo amigável
const columnLabels: Record<string, string> = {
  data: 'Data',
  codigo: 'Código',
  nomeCliente: 'Nome do Cliente',
  final: 'Valor Final',
  custoFrete: 'Frete',
  imposto: 'Imposto',
  embalagem: 'Embalagem',
  comissao: 'Comissão',
  // Novos da sua planilha:
  tipo: 'Tipo',
  vendedor: 'Vendedor',
  cidade: 'Cidade',
  origem: 'Origem',
  fidelizacao: 'Fidelização',
  logistica: 'Logística',
  item: 'Item',
  descricao: 'Descrição',
  quantidade: 'Qtd.',
  custoUnitario: 'Custo Unitário',
  valorUnitario: 'Valor Unitário',
  valorCredito: 'Valor Crédito',
  valorDescontos: 'Valor Descontos',
  // Se você ainda usar cartões/parcelas em outras planilhas, mantém:
  bandeira1: 'Bandeira',
  parcelas1: 'Parcelas',
  valorParcela1: 'Valor Parcela 1',
  taxaCartao1: 'Taxa Cartão 1',
  modoPagamento2: 'Modo Pgto. 2',
  parcelas2: 'Parcelas 2',
  bandeira2: 'Bandeira 2',
  valorParcela2: 'Valor Parcela 2',
  taxaCartao2: 'Taxa Cartão 2',
};

const getLabel = (key: string) => columnLabels[key] || key;

// Mapeia várias possibilidades de cabeçalhos para chaves do sistema
const headerMappingNormalized: Record<string, string> = {
  // datas / código / cliente
  'data': 'data',
  'data da venda': 'data',
  'codigo': 'codigo',
  'cliente': 'nomeCliente',

  // valores
  'valor final': 'final',
  'valor entrega': 'custoFrete',
  'frete': 'custoFrete',
  'valor credito': 'valorCredito',
  'valor descontos': 'valorDescontos',

  // info de item
  'item': 'item',
  'descricao': 'descricao',
  'qtd': 'quantidade',
  'qtde': 'quantidade',
  'quantidade': 'quantidade',
  'custo unitario': 'custoUnitario',
  'valor unitario': 'valorUnitario',

  // meta
  'tipo': 'tipo',
  'vendedor': 'vendedor',
  'cidade': 'cidade',
  'origem': 'origem',
  'fidelizacao': 'fidelizacao',
  'logistica': 'logistica',

  // campos de cartão/parcelas (se aparecerem em outras planilhas)
  'bandeira do cartao': 'bandeira1',
  'numero de parcelas': 'parcelas1',
  'n de parcelas': 'parcelas1',
  'no de parcelas': 'parcelas1',
  'valor parcela': 'valorParcela1',
  'taxa do cartao': 'taxaCartao1',
  'modo de pagamento 2': 'modoPagamento2',
  'bandeira cartao 2': 'bandeira2',
  'n de parcelas 2': 'parcelas2',
  'no de parcelas 2': 'parcelas2',
  'valor parcela 2': 'valorParcela2',
  'taxa cartao 2': 'taxaCartao2',
  
  // Variações comuns
  'imposto': 'imposto',
  'custo embalagem': 'embalagem',
  'comissao': 'comissao',
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

    const mappedData = raw_data.map((row) => {
      const newRow: any = {};
      for (const rawHeader in row) {
        const trimmedHeader = String(rawHeader ?? '').trim();
        const normalized = normalizeHeader(trimmedHeader);
        const systemKey = headerMappingNormalized[normalized];
  
        if (systemKey) {
          newRow[systemKey] = cleanNumericValue(row[rawHeader]);
        } else {
          console.warn(`🟡 Cabeçalho não mapeado (arquivo -> normalizado): "${trimmedHeader}" -> "${normalized}" | valor amostra:`, row[rawHeader]);
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
            } else if (typeof item.data === 'string' && item.data.trim()) {
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
