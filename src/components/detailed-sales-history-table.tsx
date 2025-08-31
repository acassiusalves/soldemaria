
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, Columns, ChevronRight, X, Eye, EyeOff, Save, Loader2, Settings2, GripVertical } from "lucide-react";
import { VendaDetalhada, CustomCalculation } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import type { Timestamp } from "firebase/firestore";
import { cn, showBlank } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Badge } from "./ui/badge";


const ITEMS_PER_PAGE = 10;
const REQUIRED_ALWAYS_ON = ["codigo"];

type SortKey = keyof VendaDetalhada | string | null;
type SortDirection = "asc" | "desc";
type ColumnVisibility = Record<string, boolean>;
type ColumnOrder = string[];


export type ColumnDef = {
  id: string;
  label: string;
  className?: string;
  isSortable?: boolean;
}

const columnLabels: Record<string, string> = {
  data: 'Data',
  codigo: 'Código',
  tipo: 'Tipo',
  nomeCliente: 'Cliente',
  vendedor: 'Vendedor',
  cidade: 'Cidade',
  origem: 'Origem',
  fidelizacao: 'Fidelização',
  logistica: 'Logística',
  item: 'Item',
  descricao: 'Descrição',
  quantidade: 'Qtd.',
  quantidadeTotal: 'Qtd. Total',
  custoUnitario: 'Custo Unitário',
  valorUnitario: 'Valor Unitário',
  final: 'Valor Final',
  custoFrete: 'Valor Entrega',
  valorCredito: 'Valor Crédito',
  valorDescontos: 'Valor Descontos',
  entregador: 'Entregador',
  valor: 'Valor',
  origemCliente: 'Origem Cliente',
  modo_de_pagamento: 'Modo Pagamento',
  tipo_pagamento: 'Tipo Pagamento',
  parcela: 'Parcela',
  instituicao_financeira: 'Instituição Financeira',
};

const getLabel = (key: string) => columnLabels[key] || key;

const FIXED_COLUMNS: ColumnDef[] = [
  { id: "codigo",       label: "Código",        isSortable: true },
  { id: "logistica",    label: "Logística",     isSortable: true },
  { id: "entregador",   label: "Entregador",    isSortable: true },
  { id: "valor",        label: "Valor",         isSortable: true, className: "text-right" },
];

interface DetailedSalesHistoryTableProps {
    data: any[];
    columns: ColumnDef[];
    tableTitle?: string;
    showAdvancedFilters?: boolean;
    columnVisibility?: ColumnVisibility;
    onVisibilityChange?: (newVisibility: ColumnVisibility) => void;
    columnOrder?: ColumnOrder;
    onOrderChange?: (newOrder: ColumnOrder) => void;
    onSavePreferences?: (key: "vendas_columns_visibility" | "vendas_columns_order", value: any) => void;
    isLoadingPreferences?: boolean;
    isSavingPreferences?: boolean;
}

const MultiSelectFilter = ({
    title,
    options,
    selectedValues,
    onSelectionChange
}: {
    title: string;
    options: string[];
    selectedValues: Set<string>;
    onSelectionChange: (newSelection: Set<string>) => void;
}) => {

    const handleToggle = (value: string) => {
        const newSet = new Set(selectedValues);
        if (newSet.has(value)) {
            newSet.delete(value);
        } else {
            newSet.add(value);
        }
        onSelectionChange(newSet);
    };

    const handleClear = () => {
        onSelectionChange(new Set());
    }

    const isFiltered = selectedValues.size > 0;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="border-dashed">
                    {title}
                    {isFiltered && (
                        <>
                            <div className="mx-2 h-4 w-px bg-muted-foreground" />
                            <Badge variant="secondary">{selectedValues.size}</Badge>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0" align="start">
                <div className="p-2 border-b border-border">
                    <p className="text-sm font-semibold">{title}</p>
                </div>
                <ScrollArea className="h-64">
                    <div className="p-2 space-y-1">
                        {options.map(option => (
                            <div key={option} className="flex items-center space-x-2 p-1 rounded-md hover:bg-accent">
                                <Checkbox
                                    id={`filter-${title}-${option}`}
                                    checked={selectedValues.has(option)}
                                    onCheckedChange={() => handleToggle(option)}
                                />
                                <label htmlFor={`filter-${title}-${option}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1">
                                    {option}
                                </label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                {isFiltered && (
                    <div className="p-2 border-t border-border">
                        <Button onClick={handleClear} variant="ghost" size="sm" className="w-full justify-center">
                            Limpar Filtro
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
};


const OrderManagerDialog = ({
    isOpen,
    onClose,
    columns,
    order,
    onOrderChange,
}: {
    isOpen: boolean;
    onClose: () => void;
    columns: ColumnDef[];
    order: string[];
    onOrderChange: (newOrder: string[]) => void;
}) => {
    const orderedColumns = useMemo(() => {
        const columnsMap = new Map(columns.map(c => [c.id, c]));
        const currentOrder = order.length > 0 ? order : columns.map(c => c.id);
        
        const ordered = currentOrder.map(id => columnsMap.get(id)).filter(Boolean) as ColumnDef[];
        const unordered = columns.filter(c => !currentOrder.includes(c.id));
        
        return [...ordered, ...unordered];
    }, [columns, order]);
    
    const handleDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(orderedColumns);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        onOrderChange(items.map(item => item.id));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Organizar Colunas</DialogTitle>
                    <DialogDescription>
                        Arraste e solte as colunas para definir a ordem de exibição na tabela.
                    </DialogDescription>
                </DialogHeader>
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="columns">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 max-h-[60vh] overflow-y-auto">
                                {orderedColumns.map((col, index) => (
                                    <Draggable key={col.id} draggableId={col.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="flex items-center p-2 border rounded-md bg-muted/50"
                                            >
                                                <GripVertical className="mr-2 h-5 w-5 text-muted-foreground" />
                                                {col.label}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button>Concluído</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function DetailedSalesHistoryTable({ 
    data, 
    columns, 
    tableTitle = "Histórico Detalhado de Vendas", 
    showAdvancedFilters = false,
    columnVisibility: controlledVisibility,
    onVisibilityChange,
    columnOrder: controlledOrder,
    onOrderChange,
    onSavePreferences,
    isLoadingPreferences = false,
    isSavingPreferences = false,
}: DetailedSalesHistoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filter, setFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [vendorFilter, setVendorFilter] = useState<Set<string>>(new Set());
  const [deliverymanFilter, setDeliverymanFilter] = useState<Set<string>>(new Set());
  const [logisticsFilter, setLogisticsFilter] = useState<Set<string>>(new Set());
  const [cityFilter, setCityFilter] = useState<Set<string>>(new Set());
  
  const [internalVisibility, setInternalVisibility] = useState<ColumnVisibility>({});
  const [internalOrder, setInternalOrder] = useState<ColumnOrder>([]);
  const [isOrderManagerOpen, setIsOrderManagerOpen] = useState(false);

  const initializedRef = useRef(false);
  
  const isManaged = !!controlledVisibility && !!onVisibilityChange && !!onSavePreferences && !!controlledOrder && !!onOrderChange;

  const columnVisibility = isManaged ? controlledVisibility : internalVisibility;
  const setColumnVisibility = isManaged ? onVisibilityChange! : setInternalVisibility;
  
  const columnOrder = isManaged ? controlledOrder : internalOrder;
  const setColumnOrder = isManaged ? onOrderChange! : setInternalOrder;


  const effectiveColumns = useMemo(() => {
    const systemColumnsToHide = [
        "id", "sourceFile", "uploadTimestamp", "subRows", "parcelas", 
        "total_valor_parcelas", "mov_estoque", "valor_da_parcela", "tipo_de_pagamento",
        "quantidade_movimentada", "costs", "customData"
    ];
    const base = (columns && columns.length > 0) ? columns : FIXED_COLUMNS;

    const map = new Map<string, ColumnDef>();
    base.forEach(c => map.set(c.id, c));
    if (data.length > 0) {
      data.forEach(row => {
        Object.keys(row).forEach(k => {
          if (!map.has(k)) {
            map.set(k, { id: k, label: getLabel(k), isSortable: true });
          }
        });
        if (row.customData) {
            Object.keys(row.customData).forEach(k => {
                if(!map.has(k)) {
                    const calc = (columns as (ColumnDef | CustomCalculation)[]).find(c => c.id === k);
                    map.set(k, { id: k, label: calc?.label || k, isSortable: true });
                }
            })
        }
      });
    }
    map.forEach((col, key) => {
        col.label = getLabel(key);
    });

    return Array.from(map.values()).filter(c => !systemColumnsToHide.includes(c.id));
  }, [columns, data]);


const detailColumns = useMemo(() => {
    const detailKeys = ['item', 'descricao', 'quantidade'];
    
    // IMPORTANTE: Nunca filtrar colunas customizadas como detailColumns
    return effectiveColumns.filter(c => {
        // Se for coluna customizada, não é detail
        if (c.id.startsWith('custom_') || c.id.startsWith('Custom_')) {
            return false;
        }
        // Caso contrário, usar a lógica normal
        return detailKeys.includes(c.id);
    });
}, [effectiveColumns]);
  
  const paymentDetailColumns: ColumnDef[] = useMemo(() => [
    { id: "modo_de_pagamento", label: "Modo Pagamento", isSortable: false },
    { id: "tipo_pagamento", label: "Tipo Pagamento", isSortable: false },
    { id: "parcela", label: "Parcela", isSortable: false },
    { id: "valor", label: "Valor", isSortable: false },
    { id: "instituicao_financeira", label: "Instituição Financeira", isSortable: false },
  ], []);


const mainColumns = useMemo(() => {
    const detailKeys = detailColumns.map(c => c.id);
    const result = effectiveColumns.filter(c => !detailKeys.includes(c.id));
    
    return result;
}, [effectiveColumns, detailColumns]);

  const { uniqueVendores, uniqueEntregadores, uniqueLogisticas, uniqueCidades } = useMemo(() => {
    const vendores = new Set<string>();
    const entregadores = new Set<string>();
    const logisticas = new Set<string>();
    const cidades = new Set<string>();

    data.forEach(item => {
        if (item.vendedor) vendores.add(item.vendedor);
        if (item.entregador) entregadores.add(item.entregador);
        if (item.logistica) logisticas.add(item.logistica);
        if (item.cidade) cidades.add(item.cidade);
    });

    return {
        uniqueVendores: Array.from(vendores).sort(),
        uniqueEntregadores: Array.from(entregadores).sort(),
        uniqueLogisticas: Array.from(logisticas).sort(),
        uniqueCidades: Array.from(cidades).sort(),
    };
  }, [data]);


  const filteredData = useMemo(() => {
    return data.filter(group => {
      const textMatch = !filter ||
                        String(group.codigo).toLowerCase().includes(filter.toLowerCase()) ||
                        String(group.nomeCliente).toLowerCase().includes(filter.toLowerCase());
      
      const vendorMatch = vendorFilter.size === 0 || vendorFilter.has(group.vendedor);
      const deliverymanMatch = deliverymanFilter.size === 0 || deliverymanFilter.has(group.entregador);
      const logisticsMatch = logisticsFilter.size === 0 || logisticsFilter.has(group.logistica);
      const cityMatch = cityFilter.size === 0 || cityFilter.has(group.cidade);

      return textMatch && vendorMatch && deliverymanMatch && logisticsMatch && cityMatch;
    });
  }, [data, filter, vendorFilter, deliverymanFilter, logisticsFilter, cityFilter]);


  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = (a as any)[sortKey] ?? (a as any).customData?.[sortKey];
      const bValue = (b as any)[sortKey] ?? (b as any).customData?.[sortKey];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      const valA = aValue?.toDate ? aValue.toDate() : aValue;
      const valB = bValue?.toDate ? bValue.toDate() : bValue;

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };
  
  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(rowId)) {
            newSet.delete(rowId);
        } else {
            newSet.add(rowId);
        }
        return newSet;
    });
  };

  const SortableHeader = ({ tkey, label, className }: { tkey: SortKey; label: string, className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(tkey)}>
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

const renderCell = (row: any, columnId: string) => {
    let value = row[columnId];
    
    if (value === null || value === undefined) {
        value = row.customData?.[columnId];
    }
    
    if (columnId === 'tipo_pagamento' || columnId === 'tipo_de_pagamento') {
        return showBlank(row.tipo_de_pagamento ?? row.tipo_pagamento);
    }
    if (columnId === 'parcela') {
        return showBlank(row.parcela);
    }

    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
        return "";
    }
    
    if (columnId === 'quantidadeTotal' && typeof value === 'number') {
        return value.toString();
    }

    const toNumber = (x: any) => {
        if (typeof x === "number") return x;
        if (typeof x === "string") {
            const cleaned = x.replace(/\u00A0/g, "").replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
            const n = Number(cleaned);
            if (!Number.isNaN(n)) return n;
        }
        return null;
    };

    if (["final","custoFrete","imposto","embalagem","comissao","custoUnitario","valorUnitario","valorCredito","valorDescontos", "valor"]
        .includes(columnId) || (typeof value === 'number' && columnId.startsWith('custom_'))) {
        const n = toNumber(value);
        if (n !== null) {
            return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        }
    }

    if (columnId === "data") {
        const d = value?.toDate ? value.toDate() : (typeof value === 'string' ? parseISO(value) : value);
        return d instanceof Date && !isNaN(d.getTime()) ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "";
    }

    if ((columnId.startsWith('custom_') || columnId.startsWith('Custom_')) && typeof value === 'number') {
        return value.toLocaleString("pt-BR");
    }

    return String(value);
};
  
  const renderDetailCell = (sale: VendaDetalhada, columnId: string) => {
    const value = (sale as any)[columnId];
    
    const toNumber = (x: any) => {
      if (typeof x === "number") return x;
      if (typeof x === "string") {
        const cleaned = x.replace(/\u00A0/g, "").replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
        const n = Number(cleaned);
        if (!Number.isNaN(n)) return n;
      }
      return null;
    };

    if(typeof value === 'number' && ['final', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos', 'valor'].includes(columnId)) {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    if (["final","custoFrete","imposto","embalagem","comissao","custoUnitario","valorUnitario","valorCredito","valorDescontos", "valor"]
        .includes(columnId)) {
      const n = toNumber(value);
      if (n !== null) {
        return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }
    }
    
    return showBlank(value);
  }

  const visibleColumns = useMemo(() => {
    const columnMap = new Map(mainColumns.map(c => [c.id, c]));
    const order = columnOrder.length > 0 ? columnOrder : mainColumns.map(c => c.id);
    
    return order
        .map(id => columnMap.get(id))
        .filter(Boolean)
        .filter(c => isManaged ? columnVisibility[c!.id] : true) as ColumnDef[];
  }, [mainColumns, columnVisibility, columnOrder, isManaged]);


  const hasActiveAdvancedFilter = useMemo(() => {
    return vendorFilter.size > 0 || deliverymanFilter.size > 0 || logisticsFilter.size > 0 || cityFilter.size > 0;
  }, [vendorFilter, deliverymanFilter, logisticsFilter, cityFilter]);

  const clearAllAdvancedFilters = () => {
    setVendorFilter(new Set());
    setDeliverymanFilter(new Set());
    setLogisticsFilter(new Set());
    setCityFilter(new Set());
  }

  const handleSetAllVisibility = (visible: boolean) => {
    if (!onVisibilityChange) return;
    const next = mainColumns.reduce((acc, col) => {
        if (!REQUIRED_ALWAYS_ON.includes(col.id)) {
            acc[col.id] = visible;
        } else {
            acc[col.id] = true;
        }
        return acc;
    }, {} as ColumnVisibility);
    onVisibilityChange(next);
  };

  const handleResetToDefault = () => {
    if (!onVisibilityChange) return;
    const defaultConfig = mainColumns.reduce((acc, col) => {
        acc[col.id] = true;
        return acc;
    }, {} as ColumnVisibility);
    onVisibilityChange(defaultConfig);
    if(onOrderChange) {
        onOrderChange(mainColumns.map(c => c.id));
    }
  };

  return (
    <>
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-h3 font-headline">{tableTitle}</h2>
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Filtrar por Código ou Cliente..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-auto"
            />
            {isManaged && onSavePreferences && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Columns className="mr-2 h-4 w-4" />
                  Visão da Tabela
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Configuração de Colunas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsOrderManagerOpen(true)}>
                    <GripVertical className="mr-2 h-4 w-4" />
                    Organizar Colunas
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>Visibilidade</span>
                    </DropdownMenuSubTrigger>
                     <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                             <DropdownMenuItem onSelect={() => handleSetAllVisibility(true)}>
                                <Eye className="mr-2 h-4 w-4" /> Mostrar Todas
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleSetAllVisibility(false)}>
                                <EyeOff className="mr-2 h-4 w-4" /> Ocultar Todas
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <ScrollArea className="h-72">
                              {mainColumns.map((column) => (
                                  <DropdownMenuCheckboxItem
                                      key={column.id}
                                      className="capitalize"
                                      checked={!!columnVisibility[column.id]}
                                      disabled={REQUIRED_ALWAYS_ON.includes(column.id)}
                                      onCheckedChange={(value) => setColumnVisibility({ ...columnVisibility, [column.id]: !!value })}
                                  >
                                      {column.label}
                                  </DropdownMenuCheckboxItem>
                              ))}
                            </ScrollArea>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onSelect={handleResetToDefault}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Resetar para Padrão
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onSelect={() => onSavePreferences('vendas_columns_visibility', columnVisibility)} disabled={isSavingPreferences}>
                    {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar esta visão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>
        </div>
        {showAdvancedFilters && (
            <div className="flex items-center gap-2 mb-4">
                <MultiSelectFilter title="Vendedor" options={uniqueVendores} selectedValues={vendorFilter} onSelectionChange={setVendorFilter} />
                <MultiSelectFilter title="Entregador" options={uniqueEntregadores} selectedValues={deliverymanFilter} onSelectionChange={setDeliverymanFilter} />
                <MultiSelectFilter title="Logística" options={uniqueLogisticas} selectedValues={logisticsFilter} onSelectionChange={setLogisticsFilter} />
                <MultiSelectFilter title="Cidade" options={uniqueCidades} selectedValues={cityFilter} onSelectionChange={setCityFilter} />
                {hasActiveAdvancedFilter && (
                    <Button variant="ghost" onClick={clearAllAdvancedFilters} className="text-muted-foreground">
                        <X className="mr-2 h-4 w-4" />
                        Limpar Filtros
                    </Button>
                )}
            </div>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[50px]"></TableHead>
                {isLoadingPreferences ? (
                    <TableHead colSpan={5} className="text-muted-foreground h-12">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando suas preferências...
                        </div>
                    </TableHead>
                ) : visibleColumns.length === 0 && isManaged ? (
                  <TableHead className="text-muted-foreground">
                    Nenhuma coluna visível — abra “Exibir Colunas” ou clique em “Resetar preferências”.
                  </TableHead>
                ) : visibleColumns.map(col => (
                  col.isSortable ? (
                    <SortableHeader key={col.id} tkey={col.id} label={col.label} className={col.className} />
                  ) : (
                    <TableHead key={col.id} className={col.className}>{col.label}</TableHead>
                  )
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow>
                       <TableCell>
                          {(row.subRows?.length > 0 || row.parcelas?.length > 0 || row.costs?.length > 0) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleRowExpansion(row.id)}>
                                <ChevronRight className={cn("h-4 w-4 transition-transform", expandedRows.has(row.id) && "rotate-90")} />
                            </Button>
                          )}
                       </TableCell>
                       {visibleColumns.map(col => (
                         <TableCell key={col.id} className={cn(col.className, col.id === 'final' ? 'font-semibold' : '')}>
                           {renderCell(row, col.id)}
                         </TableCell>
                       ))}
                    </TableRow>
                    {expandedRows.has(row.id) && (
                        <TableRow>
                            <TableCell colSpan={visibleColumns.length + 1} className="p-2 bg-muted/50">
                                <Tabs defaultValue="items" className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="items" disabled={!row.subRows || row.subRows.length === 0}>Itens do Pedido</TabsTrigger>
                                        <TabsTrigger value="payment" disabled={!row.costs || row.costs.length === 0}>Detalhes do Pagamento</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="items">
                                      {row.subRows && row.subRows.length > 0 && (
                                        <div className="p-2 rounded-md bg-background">
                                           <Table>
                                             <TableHeader>
                                               <TableRow>
                                                  {detailColumns.map(col => <TableHead key={col.id}>{col.label}</TableHead>)}
                                               </TableRow>
                                             </TableHeader>
                                             <TableBody>
                                                {row.subRows.map((item: VendaDetalhada, index: number) => (
                                                  <TableRow key={`${item.id}-${index}`}>
                                                      {detailColumns.map(col => <TableCell key={col.id}>{renderDetailCell(item, col.id)}</TableCell>)}
                                                  </TableRow>
                                                ))}
                                             </TableBody>
                                           </Table>
                                        </div>
                                      )}
                                    </TabsContent>
                                    <TabsContent value="payment">
                                       {row.costs && row.costs.length > 0 && (
                                          <div className="p-2 rounded-md bg-background">
                                           <Table>
                                             <TableHeader>
                                               <TableRow>
                                                  {paymentDetailColumns.map(col => <TableHead key={col.id}>{col.label}</TableHead>)}
                                               </TableRow>
                                             </TableHeader>
                                             <TableBody>
                                                {row.costs.map((cost: any, index: number) => (
                                                  <TableRow key={`${cost.id}-${index}`}>
                                                      {paymentDetailColumns.map(col => <TableCell key={col.id}>{renderDetailCell(cost, col.id)}</TableCell>)}
                                                  </TableRow>
                                                ))}
                                             </TableBody>
                                           </Table>
                                          </div>
                                       )}
                                    </TabsContent>
                                </Tabs>
                            </TableCell>
                        </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                    Nenhum resultado encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
            <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
            >
                Anterior
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
            >
                Próxima
            </Button>
        </div>
      </CardContent>
    </Card>
    {isManaged && (
        <OrderManagerDialog
            isOpen={isOrderManagerOpen}
            onClose={() => setIsOrderManagerOpen(false)}
            columns={mainColumns}
            order={columnOrder}
            onOrderChange={setColumnOrder}
        />
    )}
    </>
  );
}
