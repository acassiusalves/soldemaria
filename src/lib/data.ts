
export type Venda = {
  id: string;
  data: string; // YYYY-MM-DD
  categoria: "Esportivo" | "Casual" | "Social" | "Bota";
  produto: string;
  unidadesVendidas: number;
  receita: number;
};

// Dados de exemplo do painel foram limpos para um novo começo.
export const salesData: Venda[] = [];

export type Parcela = {
    numero: number;
    taxa: number;
};

export type Operadora = {
  id: string;
  nome: string;
  taxaDebito: number;
  taxasCredito: Parcela[];
};

export type VendaDetalhada = {
  id: string;
  data: any; // Allow different date types during upload
  codigo: number;
  parcelas1: number;
  bandeira1: string;
  valorParcela1?: number;
  taxaCartao1?: number;
  modoPagamento2?: string;
  parcelas2?: number;
  bandeira2?: string;
  valorParcela2?: number;
  taxaCartao2?: number;
  custoFrete?: number;
  imposto?: number;
  embalagem?: number;
  comissao?: number;
  final: number;
  nomeCliente?: string;
  sourceFile?: string;
  uploadTimestamp?: any;
  vendedor?: string;
  cidade?: string;
  origem?: string;
  logistica?: string;
  tipo?: string;
  item?: string;
  descricao?: string;
  quantidade?: number;
  custoUnitario?: number;
  valorUnitario?: number;
  valorCredito?: number;
  valorDescontos?: number;
  // Campos que podem ser adicionados por outras fontes de dados
  subRows?: VendaDetalhada[];
  costs?: any[];
  customData?: Record<string, number>;
};

export type LogisticaDetalhada = VendaDetalhada;

// -- Custom Calculation Types --
export type FormulaItem = { type: 'column' | 'operator' | 'number'; value: string; label: string };

export interface CustomCalculation {
    id: string;
    name: string;
    formula: FormulaItem[];
    isPercentage?: boolean;
    targetMarketplace?: string;
    interaction?: {
        targetColumn: string;
        operator: '+' | '-';
    };
}
