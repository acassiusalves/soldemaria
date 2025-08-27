export type Venda = {
  id: string;
  data: string; // YYYY-MM-DD
  categoria: "Esportivo" | "Casual" | "Social" | "Bota";
  produto: string;
  unidadesVendidas: number;
  receita: number;
};

export const salesData: Venda[] = [
  { id: "1", data: "2023-01-05", categoria: "Esportivo", produto: "Tênis de Corrida UltraBoost", unidadesVendidas: 15, receita: 8250 },
  { id: "2", data: "2023-01-08", categoria: "Casual", produto: "Sapatênis de Couro Marrom", unidadesVendidas: 20, receita: 5980 },
  { id: "3", data: "2023-01-12", categoria: "Social", produto: "Sapato Oxford Preto", unidadesVendidas: 10, receita: 4500 },
  { id: "4", data: "2023-01-20", categoria: "Bota", produto: "Bota de Caminhada Impermeável", unidadesVendidas: 12, receita: 6600 },
  { id: "5", data: "2023-02-02", categoria: "Esportivo", produto: "Tênis de Basquete High-Top", unidadesVendidas: 8, receita: 5200 },
  { id: "6", data: "2023-02-10", categoria: "Casual", produto: "Tênis de Lona Branco", unidadesVendidas: 30, receita: 5400 },
  { id: "7", data: "2023-02-15", categoria: "Social", produto: "Mocassim de Camurça Azul", unidadesVendidas: 14, receita: 4830 },
  { id: "8", data: "2023-02-22", categoria: "Esportivo", produto: "Tênis de Corrida UltraBoost", unidadesVendidas: 18, receita: 9900 },
  { id: "9", data: "2023-03-01", categoria: "Bota", produto: "Bota Chelsea de Couro", unidadesVendidas: 15, receita: 7425 },
  { id: "10", data: "2023-03-07", categoria: "Casual", produto: "Sapatênis de Couro Marrom", unidadesVendidas: 25, receita: 7475 },
  { id: "11", data: "2023-03-18", categoria: "Esportivo", produto: "Tênis de Skate Clássico", unidadesVendidas: 22, receita: 6160 },
  { id: "12", data: "2023-03-25", categoria: "Social", produto: "Sapato Oxford Preto", unidadesVendidas: 13, receita: 5850 },
  { id: "13", data: "2023-04-05", categoria: "Casual", produto: "Tênis de Lona Branco", unidadesVendidas: 35, receita: 6300 },
  { id: "14", data: "2023-04-10", categoria: "Esportivo", produto: "Tênis de Corrida UltraBoost", unidadesVendidas: 20, receita: 11000 },
  { id: "15", data: "2023-04-19", categoria: "Bota", produto: "Bota de Caminhada Impermeável", unidadesVendidas: 10, receita: 5500 },
  { id: "16", data: "2023-04-28", categoria: "Social", produto: "Mocassim de Camurça Azul", unidadesVendidas: 11, receita: 3795 },
  { id: "17", data: "2023-05-03", categoria: "Esportivo", produto: "Tênis de Basquete High-Top", unidadesVendidas: 10, receita: 6500 },
  { id: "18", data: "2023-05-11", categoria: "Casual", produto: "Sapatênis de Couro Marrom", unidadesVendidas: 18, receita: 5382 },
  { id: "19", data: "2023-05-21", categoria: "Esportivo", produto: "Tênis de Corrida UltraBoost", unidadesVendidas: 25, receita: 13750 },
  { id: "20", data: "2023-05-29", categoria: "Bota", produto: "Bota Chelsea de Couro", unidadesVendidas: 12, receita: 5940 },
  { id: "21", data: "2023-06-06", categoria: "Social", produto: "Sapato Oxford Preto", unidadesVendidas: 15, receita: 6750 },
  { id: "22", data: "2023-06-14", categoria: "Casual", produto: "Tênis de Lona Branco", unidadesVendidas: 40, receita: 7200 },
  { id: "23", data: "2023-06-23", categoria: "Esportivo", produto: "Tênis de Skate Clássico", unidadesVendidas: 28, receita: 7840 },
  { id: "24", data: "2023-06-30", categoria: "Esportivo", produto: "Tênis de Corrida UltraBoost", unidadesVendidas: 22, receita: 12100 },
  { id: "25", data: "2023-07-04", categoria: "Bota", produto: "Bota de Caminhada Impermeável", unidadesVendidas: 14, receita: 7700 },
  { id: "26", data: "2023-07-12", categoria: "Social", produto: "Mocassim de Camurça Azul", unidadesVendidas: 16, receita: 5520 },
  { id: "27", data: "2023-07-20", categoria: "Casual", produto: "Sapatênis de Couro Marrom", unidadesVendidas: 22, receita: 6578 },
  { id: "28", data: "2023-07-28", categoria: "Esportivo", produto: "Tênis de Basquete High-Top", unidadesVendidas: 12, receita: 7800 },
  { id: "29", data: "2023-08-05", categoria: "Casual", produto: "Tênis de Lona Branco", unidadesVendidas: 38, receita: 6840 },
  { id: "30", data: "2023-08-15", categoria: "Esportivo", produto: "Tênis de Corrida UltraBoost", unidadesVendidas: 30, receita: 16500 },
  { id: "31", data: "2023-08-25", categoria: "Bota", produto: "Bota Chelsea de Couro", unidadesVendidas: 18, receita: 8910 },
  { id: "32", data: "2023-09-02", categoria: "Social", produto: "Sapato Oxford Preto", unidadesVendidas: 18, receita: 8100 },
  { id: "33", data: "2023-09-10", categoria: "Esportivo", produto: "Tênis de Skate Clássico", unidadesVendidas: 30, receita: 8400 },
  { id: "34", data: "2023-09-18", categoria: "Casual", produto: "Sapatênis de Couro Marrom", unidadesVendidas: 28, receita: 8372 },
  { id: "35", data: "2023-09-26", categoria: "Esportivo", produto: "Tênis de Corrida UltraBoost", unidadesVendidas: 28, receita: 15400 },
  { id: "36", data: "2023-10-04", categoria: "Bota", produto: "Bota de Caminhada Impermeável", unidadesVendidas: 20, receita: 11000 },
  { id: "37", data: "2023-10-12", categoria: "Social", produto: "Mocassim de Camurça Azul", unidadesVendidas: 20, receita: 6900 },
  { id: "38", data: "2023-10-21", categoria: "Esportivo", produto: "Tênis de Basquete High-Top", unidadesVendidas: 15, receita: 9750 },
  { id: "39", data: "2023-10-29", categoria: "Casual", produto: "Tênis de Lona Branco", unidadesVendidas: 45, receita: 8100 },
  { id: "40", data: "2023-11-06", categoria: "Esportivo", produto: "Tênis de Corrida UltraBoost", unidadesVendidas: 35, receita: 19250 },
  { id: "41", data: "2023-11-14", categoria: "Bota", produto: "Bota Chelsea de Couro", unidadesVendidas: 22, receita: 10890 },
  { id: "42", data: "2023-11-22", categoria: "Casual", produto: "Sapatênis de Couro Marrom", unidadesVendidas: 32, receita: 9568 },
  { id: "43", data: "2023-11-28", categoria: "Social", produto: "Sapato Oxford Preto", unidadesVendidas: 20, receita: 9000 },
  { id: "44", data: "2023-12-05", categoria: "Esportivo", produto: "Tênis de Skate Clássico", unidadesVendidas: 38, receita: 10640 },
  { id: "45", data: "2023-12-12", categoria: "Casual", produto: "Tênis de Lona Branco", unidadesVendidas: 50, receita: 9000 },
  { id: "46", data: "2023-12-18", categoria: "Bota", produto: "Bota de Caminhada Impermeável", unidadesVendidas: 25, receita: 13750 },
  { id: "47", data: "2023-12-24", categoria: "Esportivo", produto: "Tênis de Corrida UltraBoost", unidadesVendidas: 40, receita: 22000 },
  { id: "48", data: "2023-12-30", categoria: "Social", produto: "Mocassim de Camurça Azul", unidadesVendidas: 25, receita: 8625 },
];

export type VendaDetalhada = {
  id: string;
  data: string; // YYYY-MM-DD
  codigo: number;
  parcelas1: number;
  bandeira1: string;
  valorParcela1: number;
  taxaCartao1: number;
  modoPagamento2?: string;
  parcelas2?: number;
  bandeira2?: string;
  valorParcela2?: number;
  taxaCartao2?: number;
  custoFrete?: number;
  imposto?: number;
  embalagem: number;
  comissao: number;
  final: number;
};

export const detailedSalesData: VendaDetalhada[] = [
  { id: "1", data: "2025-06-30", codigo: 350826, parcelas1: 1, bandeira1: "Mastercard", valorParcela1: 119.90, taxaCartao1: 4.29, embalagem: 2.16, comissao: 1.80, final: 119.90 },
  { id: "2", data: "2025-06-30", codigo: 350827, parcelas1: 2, bandeira1: "Mastercard", valorParcela1: 99.90, taxaCartao1: 5.22, embalagem: 2.16, comissao: 1.50, final: 99.90 },
  { id: "3", data: "2025-06-30", codigo: 350834, parcelas1: 1, bandeira1: "Stone", valorParcela1: 89.90, taxaCartao1: 0.00, embalagem: 2.16, comissao: 1.35, final: 89.90 },
  // Adding more mock data based on the pattern
  { id: "4", data: "2025-07-01", codigo: 350835, parcelas1: 3, bandeira1: "Visa", valorParcela1: 150.00, taxaCartao1: 6.50, embalagem: 3.00, comissao: 2.25, final: 150.00 },
  { id: "5", data: "2025-07-01", codigo: 350836, parcelas1: 1, bandeira1: "Elo", valorParcela1: 75.50, taxaCartao1: 2.10, embalagem: 1.50, comissao: 1.13, final: 75.50 },
  { id: "6", data: "2025-07-02", codigo: 350837, parcelas1: 4, bandeira1: "Mastercard", valorParcela1: 220.00, taxaCartao1: 10.80, embalagem: 4.00, comissao: 3.30, final: 220.00 },
  { id: "7", data: "2025-07-03", codigo: 350838, parcelas1: 2, bandeira1: "Stone", valorParcela1: 130.00, taxaCartao1: 0.00, embalagem: 2.50, comissao: 1.95, final: 130.00 },
  { id: "8", data: "2025-07-03", codigo: 350839, parcelas1: 1, bandeira1: "Visa", valorParcela1: 95.00, taxaCartao1: 3.50, embalagem: 2.00, comissao: 1.42, final: 95.00 },
  { id: "9", data: "2025-07-04", codigo: 350840, parcelas1: 6, bandeira1: "Hipercard", valorParcela1: 350.00, taxaCartao1: 15.00, embalagem: 5.00, comissao: 5.25, final: 350.00 },
  { id: "10", data: "2025-07-05", codigo: 350841, parcelas1: 1, bandeira1: "Mastercard", valorParcela1: 110.00, taxaCartao1: 4.10, embalagem: 2.10, comissao: 1.65, final: 110.00 },
  { id: "11", data: "2025-07-06", codigo: 350842, parcelas1: 2, bandeira1: "Visa", valorParcela1: 180.00, taxaCartao1: 7.90, embalagem: 3.50, comissao: 2.70, final: 180.00 },
  { id: "12", data: "2025-07-07", codigo: 350843, parcelas1: 1, bandeira1: "Amex", valorParcela1: 500.00, taxaCartao1: 20.00, embalagem: 10.00, comissao: 7.50, final: 500.00 }
];
