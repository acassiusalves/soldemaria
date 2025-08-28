
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
};

export type LogisticaDetalhada = VendaDetalhada;
