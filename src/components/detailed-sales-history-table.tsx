

"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, Columns, ChevronRight, X, Eye, EyeOff, Save, Loader2, Settings2, GripVertical, Calculator, Search, Info, Package } from "lucide-react";
import { VendaDetalhada, CustomCalculation, Operadora } from "@/lib/data";
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
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";


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
  valor: 'Valor Logística',
  origemCliente: 'Origem Cliente',
  modo_de_pagamento: 'Modo Pagamento',
  tipo_pagamento: 'Tipo Pagamento',
  parcela: 'Parcela',
  instituicao_financeira: 'Instituição Financeira',
  custo: 'Custo',
  custoEmbalagem: 'Custo Embalagem',
  custoTotal: 'Custo Total',
  taxaTotalCartao: 'Taxa Cartão',
};

const getLabel = (key: string, customCalculations: CustomCalculation[] = []) => {
    if (key.startsWith('custom_')) {
        const calc = customCalculations.find(c => c.id === key);
        if (calc?.name) {
            return calc.name;
        }
    }
    
    return columnLabels[key] || key;
};


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
    customCalculations?: CustomCalculation[];
    taxasOperadoras?: Operadora[];
    isLogisticsPage?: boolean;
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


const SortableItem = ({ id, label }: { id: string; label: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center p-3 border rounded-md bg-background cursor-grab active:cursor-grabbing",
        isDragging && "shadow-lg border-primary"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="mr-3 h-5 w-5 text-muted-foreground" />
      <span className="flex-1 select-none">{label}</span>
    </div>
  );
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
    const [localOrder, setLocalOrder] = useState<string[]>([]);
    
    useEffect(() => {
        if (isOpen) {
            const columnsMap = new Map(columns.map(c => [c.id, c]));
            const currentOrder = order.length > 0 ? order : columns.map(c => c.id);
            
            const validOrder = currentOrder.filter(id => columnsMap.has(id));
            const missingColumns = columns
                .filter(c => !validOrder.includes(c.id))
                .map(c => c.id);
            
            setLocalOrder([...validOrder, ...missingColumns]);
        }
    }, [isOpen, columns, order]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const orderedColumns = useMemo(() => {
        const columnsMap = new Map(columns.map(c => [c.id, c]));
        return localOrder
            .map(id => columnsMap.get(id))
            .filter(Boolean) as ColumnDef[];
    }, [columns, localOrder]);
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (over && active.id !== over.id) {
            setLocalOrder(items => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };
    
    const handleSave = () => {
        onOrderChange(localOrder);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Organizar Colunas</DialogTitle>
                    <DialogDescription>
                        Arraste as colunas para reorganizar a ordem de exibição.
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="max-h-[60vh] pr-4">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={localOrder}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {orderedColumns.map(col => (
                                    <SortableItem
                                        key={col.id}
                                        id={col.id}
                                        label={col.label}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </ScrollArea>
                
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                        Salvar Ordem
                    </Button>
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
    customCalculations = [],
    taxasOperadoras = [],
    isLogisticsPage = false,
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
      setIsMounted(true);
  }, []);

  const initializedRef = useRef(false);
  
  const isManaged = !!controlledVisibility && !!onVisibilityChange && !!onSavePreferences && !!controlledOrder && !!onOrderChange;

  const columnVisibility = isManaged ? controlledVisibility : internalVisibility;
  const setColumnVisibility = isManaged ? onVisibilityChange! : setInternalVisibility;
  
  const columnOrder = useMemo(() => {
    if (isManaged && controlledOrder) {
      return controlledOrder;
    }
    return internalOrder;
  }, [isManaged, controlledOrder, internalOrder]);

  const setColumnOrder = isManaged ? onOrderChange! : setInternalOrder;


  const effectiveColumns = useMemo(() => {
    const systemColumnsToHide = [
        "id", "sourceFile", "uploadTimestamp", "subRows", "parcelas", "embalagens",
        "total_valor_parcelas", "mov_estoque", "valor_da_parcela", "tipo_de_pagamento",
        "quantidade_movimentada", "costs", "customData"
    ];

    if (isLogisticsPage) {
        systemColumnsToHide.push("custoTotal", "taxaTotalCartao");
    }

    const base = (columns && columns.length > 0) ? columns : FIXED_COLUMNS;

    const map = new Map<string, ColumnDef>();
    
    base.forEach(c => map.set(c.id, c));
    
    if (data.length > 0) {
        data.forEach(row => {
            Object.keys(row).forEach(k => {
                if (!map.has(k) && !systemColumnsToHide.includes(k)) {
                    map.set(k, { 
                        id: k, 
                        label: getLabel(k, customCalculations),
                        isSortable: true 
                    });
                }
            });
            if (row.customData) {
                Object.keys(row.customData).forEach(k => {
                    if(!map.has(k)) {
                        map.set(k, { 
                            id: k, 
                            label: getLabel(k, customCalculations),
                            isSortable: true 
                        });
                    }
                })
            }
        });
    }
    
    map.forEach((col, key) => {
        col.label = getLabel(key, customCalculations);
    });

    if (!isLogisticsPage) {
        if (!map.has('custoTotal')) {
            map.set('custoTotal', { id: 'custoTotal', label: getLabel('custoTotal', customCalculations), isSortable: true });
        }
        if (!map.has('taxaTotalCartao')) {
            map.set('taxaTotalCartao', { id: 'taxaTotalCartao', label: getLabel('taxaTotalCartao', customCalculations), isSortable: true });
        }
    }

    return Array.from(map.values()).filter(c => !systemColumnsToHide.includes(c.id));
}, [columns, data, customCalculations, isLogisticsPage]);

  const detailColumns = useMemo(() => {
    const detailKeys = ['item', 'descricao', 'quantidade', 'valorUnitario', 'custoUnitario', 'valorCredito', 'valorDescontos'];
    
    return effectiveColumns.filter(c => {
        if (c.id.startsWith('custom_') || c.id.startsWith('Custom_')) {
            return false;
        }
        return detailKeys.includes(c.id);
    });
  }, [effectiveColumns]);
  
  const paymentDetailColumns: ColumnDef[] = useMemo(() => [
    { id: "modo_de_pagamento", label: "Modo Pagamento", isSortable: false },
    { id: "tipo_pagamento", label: "Tipo Pagamento", isSortable: false },
    { id: "parcela", label: "Parcela", isSortable: false },
    { id: "valor", label: "Valor", isSortable: false },
    { id: "instituicao_financeira", label: "Instituição Financeira", isSortable: false },
    { id: "taxaCalculada", label: "Taxa (R$)", isSortable: false },
  ], []);

  const mainColumns = useMemo(() => {
    const detailKeys = detailColumns.map(c => c.id);
    return effectiveColumns.filter(c => !detailKeys.includes(c.id));
  }, [effectiveColumns, detailColumns]);

  useEffect(() => {
    if (!isManaged && mainColumns.length > 0 && !initializedRef.current) {
        const allColumnIds = mainColumns.map(c => c.id);
        if (!allColumnIds.includes('quantidadeTotal')) {
            const quantColumn = { id: 'quantidadeTotal', label: 'Qtd. Total', isSortable: true };
            allColumnIds.push('quantidadeTotal');
        }
        
        const defaultVisibility = allColumnIds.reduce((acc, id) => {
            acc[id] = true;
            return acc;
        }, {} as ColumnVisibility);
        
        setInternalVisibility(defaultVisibility);
        setInternalOrder(allColumnIds);
        initializedRef.current = true;
    }
  }, [isManaged, mainColumns]);

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
      let aValue = (a as any)[sortKey];
      let bValue = (b as any)[sortKey];
      
      // Check customData if primary field is not present
      if (aValue === undefined || aValue === null) aValue = a.customData?.[sortKey];
      if (bValue === undefined || bValue === null) bValue = b.customData?.[sortKey];

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
        {tkey?.toString().startsWith('custom_') && <Calculator className="mr-2 h-4 w-4 text-amber-500" />}
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  const renderCell = (row: any, columnId: string) => {
      let value = row[columnId];
      
      if (columnId.startsWith('custom_') || value === null || value === undefined) {
          value = row.customData?.[columnId] ?? value;
      }
      
      if(columnId === 'custoTotal' && value === undefined) {
          value = row.custoTotal;
      }
      
      if(columnId === 'taxaTotalCartao' && value === undefined) {
          value = row.taxaTotalCartao;
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
  
      const customCalc = customCalculations.find(c => c.id === columnId);
      const isPercentage = customCalc?.isPercentage;
  
      if (isPercentage && typeof value === 'number') {
        return `${value.toFixed(2)}%`;
      }
  
      if (["final","custoFrete","imposto","embalagem","comissao","custoUnitario","valorUnitario","valorCredito","valorDescontos", "valor", "custoEmbalagem", "custoTotal", "taxaTotalCartao"]
          .includes(columnId) || (typeof value === 'number' && columnId.startsWith('custom_') && !isPercentage)) {
          const n = toNumber(value);
          if (n !== null) {
              return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          }
      }
  
      if (columnId === "data") {
          const d = value?.toDate ? value.toDate() : (typeof value === 'string' ? parseISO(value) : value);
          return d instanceof Date && !isNaN(d.getTime()) ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "";
      }
  
      if ((columnId.startsWith('custom_') || columnId.startsWith('Custom_')) && typeof value === 'number' && !isPercentage) {
          return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    if(typeof value === 'number' && ['final', 'custoUnitario', 'valorUnitario', 'valorCredito', 'valorDescontos', 'valor', 'taxaCalculada', 'custo', 'calculatedCost'].includes(columnId)) {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    if (["final","custoFrete","imposto","embalagem","comissao","custoUnitario","valorUnitario","valorCredito","valorDescontos", "valor", "custo"]
        .includes(columnId)) {
      const n = toNumber(value);
      if (n !== null) {
        return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }
    }
    
    return showBlank(value);
  }

  const calculatedCosts = (costs: any[]) => {
    if (!costs) return [];
    return costs.map(cost => {
      const valor = Number(cost.valor) || 0;
      const modo = (cost.modo_de_pagamento || '').toLowerCase();
      const tipo = (cost.tipo_pagamento || '').toLowerCase();
      const instituicao = (cost.instituicao_financeira || '').toLowerCase();
      const parcela = Number(cost.parcela) || 1;

      let taxaPercentual = 0;
      const operadora = taxasOperadoras.find(op => op.nome.toLowerCase() === instituicao);

      if (operadora) {
        if (modo.includes('cartão') && tipo.includes('débito')) {
          taxaPercentual = operadora.taxaDebito || 0;
        } else if (modo.includes('cartão') && tipo.includes('crédito')) {
          const taxaCredito = operadora.taxasCredito.find(t => t.numero === parcela);
          taxaPercentual = taxaCredito?.taxa || 0;
        }
      }

      const taxaCalculada = valor * (taxaPercentual / 100);
      return { ...cost, taxaCalculada };
    });
  };

  const visibleColumns = useMemo(() => {
    const columnMap = new Map(mainColumns.map(c => [c.id, c]));
    
    const baseOrder = (columnOrder && columnOrder.length > 0)
      ? columnOrder
      : mainColumns.map(c => c.id);
  
    const fullOrder = [
      ...baseOrder,
      ...mainColumns.map(c => c.id).filter(id => !baseOrder.includes(id)),
    ];
  
    return fullOrder
      .map(id => columnMap.get(id))
      .filter(Boolean)
      .filter(c => (isManaged ? columnVisibility[c!.id] !== false : true)) as ColumnDef[];
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
  
const renderEmbalagemTab = (row: any) => {
  const itens = Array.isArray(row.embalagens) ? row.embalagens : [];
  return (
    <div className="p-2 rounded-md bg-background space-y-3">
        <div className="text-sm text-muted-foreground">
            Modalidade: <b>{/loja/i.test(String(row.logistica)) ? 'Loja' : 'Delivery'}</b> ·
            Qtd. Total de Itens: <b>{Number(row.quantidadeTotal) || 0}</b> ·
            Custo Total Embalagem: <b>{renderCell(row, 'custoEmbalagem')}</b>
        </div>
        <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 gap-0 bg-muted/40 px-3 py-2 text-sm font-medium">
                <div>Item</div>
                <div className="text-right">Qtd.</div>
                <div className="text-right">Custo unit.</div>
                <div className="text-right">Subtotal</div>
            </div>
            {itens.length === 0 ? (
                <div className="px-3 py-2 text-sm text-center text-muted-foreground">Sem itens de embalagem aplicados.</div>
            ) : itens.map((e: any, idx: number) => (
                <div key={idx} className="grid grid-cols-4 gap-0 px-3 py-2 text-sm border-t">
                    <div>{String(e.nome)}</div>
                    <div className="text-right">{e.quantity}</div>
                    <div className="text-right">{renderDetailCell(e, 'custo')}</div>
                    <div className="text-right">{renderDetailCell(e, 'calculatedCost')}</div>
                </div>
            ))}
        </div>
    </div>
  );
};


  return (
    <>
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-h3 font-headline">{tableTitle}</h2>
          <div className="flex items-center gap-2">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                placeholder="Filtrar por Código ou Cliente..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9"
                />
            </div>
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
                 <DropdownMenuItem onSelect={() => {
                    onSavePreferences('vendas_columns_visibility', columnVisibility)
                    if(onOrderChange) onSavePreferences('vendas_columns_order', columnOrder)
                 }} disabled={isSavingPreferences}>
                    {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar esta visão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            {showAdvancedFilters && (
                <div className="flex items-center gap-2 flex-wrap">
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
            <div className="text-sm font-medium text-muted-foreground sm:ml-auto">
                {data.length} registros
            </div>
        </div>

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
                    Nenhuma coluna visível — abra "Exibir Colunas" ou clique em "Resetar preferências".
                  </TableHead>
                ) : visibleColumns.map(col => (
                  col.isSortable ? (
                    <SortableHeader key={col.id} tkey={col.id} label={col.label} className={col.className} />
                  ) : (
                    <TableHead key={col.id} className={col.className}>
                       <div className="flex items-center">
                          {col.id.startsWith('custom_') && <Calculator className="mr-2 h-4 w-4 text-amber-500" />}
                          {col.label}
                       </div>
                    </TableHead>
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
                          {(row.subRows?.length > 0 || row.costs?.length > 0 || row.embalagens?.length > 0) && (
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
                                        <TabsTrigger value="packaging">Embalagens</TabsTrigger>
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
                                          <div className="p-2 rounded-md bg-background space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-sm mb-2">Taxas e Custos</h4>
                                                <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                    {paymentDetailColumns.map(col => (
                                                        <TableHead key={col.id}>
                                                            <div className="flex items-center gap-1">
                                                            {col.label}
                                                            {col.id === 'taxaCalculada' && (
                                                                <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                    <p>Cálculo baseado nas taxas por operadora e<br/>parcela definidas na tela de Taxas.</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                            </div>
                                                        </TableHead>
                                                    ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {calculatedCosts(row.costs).map((cost: any, index: number) => (
                                                    <TableRow key={`${cost.id}-${index}`}>
                                                        {paymentDetailColumns.map(col => <TableCell key={col.id}>{renderDetailCell(cost, col.id)}</TableCell>)}
                                                    </TableRow>
                                                    ))}
                                                </TableBody>
                                                </Table>
                                            </div>
                                          </div>
                                       )}
                                    </TabsContent>
                                    <TabsContent value="packaging">
                                        {renderEmbalagemTab(row)}
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
    {isMounted && isManaged && (
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











    
