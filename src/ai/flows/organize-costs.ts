'use server';

import { z } from 'zod';

export type OrganizeCostsInput = {
  costsData: any[];
  apiKey: string;
};

export type OrganizeCostsOutput = {
  organizedData: any[];
};

// helper: remover acentos e “lixo” comum
function normalizePayStr(s: string) {
  return s
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // remove acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')                            // normaliza espaços
    .trim();
}

// helper: extrair número de parcelas
function extractParcelas(s: string): string {
  // pega "3x", "3 x", "em 3x", "3/10" (usa o primeiro número como qtd de parcelas)
  const m = s.match(/(?:^|\D)(\d{1,2})\s*(?:x|\/\d{1,2})/i);
  if (m && m[1]) return m[1];
  // se mencionar "credito" mas não encontrou, assume 1x
  if (s.includes('credito') || s.includes('cartao')) return '1';
  return '';
}

// FUNÇÃO PRINCIPAL - Organizar Custos
export async function organizeCosts(input: OrganizeCostsInput): Promise<OrganizeCostsOutput> {
  console.log('💰 CUSTOS: Iniciando organização');
  console.log('📊 Dados recebidos:', input.costsData?.length || 0, 'itens');
  
  try {
    // Validações
    if (!input) {
      throw new Error('Input não fornecido');
    }
    
    if (!input.costsData || !Array.isArray(input.costsData)) {
      throw new Error('costsData deve ser um array');
    }
    
    if (input.costsData.length === 0) {
      console.log('⚠️ Array vazio, retornando vazio');
      return { organizedData: [] };
    }
    
    console.log('📋 Exemplo de item:', JSON.stringify(input.costsData[0], null, 2));
    
    // Processar TODOS os dados - sem perder nenhum
    const processedData = input.costsData.map((item, index) => {
      try {
        // Criar uma cópia completa do item original
        const processedItem = JSON.parse(JSON.stringify(item));
        
        // REGRAS DE ORGANIZAÇÃO ESPECÍFICAS PARA CUSTOS
        
        // 1. Mapear mov_estoque → codigo (é o código no seu sistema)
        if (processedItem.mov_estoque) {
          processedItem.codigo = String(processedItem.mov_estoque);
        }
        
        // 2. Mapear valor_da_parcela → valor
        if (processedItem.valor_da_parcela) {
          processedItem.valor = processedItem.valor_da_parcela;
        }
        
        // 3. ORGANIZAR MODO DE PAGAMENTO COM AS REGRAS ESPECÍFICAS
        if (typeof processedItem.modo_de_pagamento === 'string' && processedItem.modo_de_pagamento.trim() !== '') {
          const raw = processedItem.modo_de_pagamento;
          const norm = normalizePayStr(raw); // ex: "cartao/credito 3x"
          console.log(`🔍 Processando: "${raw}" → "${norm}"`);

          // defaults
          let modo = '';
          let tipo = '';
          let parcela = '';

          if (norm === 'pix' || norm.includes('pix ') || norm.includes(' pix')) {
            modo = 'PIX';
            tipo = '';
            parcela = '';
          } else if (norm.includes('pix') && (norm.includes('qr') || norm.includes('code'))) {
            modo = 'PIX';
            tipo = 'QR Code';
            parcela = '';
          } else if (norm === 'dinheiro') {
            modo = 'Dinheiro';
            tipo = '';
            parcela = '';
          } else if (norm.includes('cartao') && norm.includes('debito')) {
            modo = 'Cartão';
            tipo = 'Débito';
            parcela = '';
          } else if (norm.includes('cartao') && norm.includes('credito')) {
            modo = 'Cartão';
            tipo = 'Crédito';
            parcela = extractParcelas(norm) || '1';
          } else if (norm.includes('cartao')) {
            modo = 'Cartão';
            tipo = 'Crédito';
            parcela = extractParcelas(norm) || '1';
          } else {
            // fallback: capitaliza a primeira letra
            modo = raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
            tipo = '';
            parcela = '';
          }

          processedItem.modo_de_pagamento = modo;

          // >>> preenche os DOIS nomes de campo por segurança <<<
          processedItem.tipo_pagamento = tipo;
          processedItem.tipo_de_pagamento = tipo;

          processedItem.parcela = parcela;
        } else {
          processedItem.modo_de_pagamento = processedItem.modo_de_pagamento || '';
          processedItem.tipo_pagamento = '';
          processedItem.tipo_de_pagamento = '';
          processedItem.parcela = '';
        }
        
        // 4. Garantir que valor é numérico
        if (processedItem.valor && typeof processedItem.valor === 'string') {
          const valorStr = processedItem.valor.replace(/[R$\s]/gi, '').replace(/,/g, '.');
          const valor = parseFloat(valorStr);
          processedItem.valor = isNaN(valor) ? 0 : valor;
        }
        
        // 5. Garantir código existe (fallback caso mov_estoque não tenha valor)
        if (!processedItem.codigo || processedItem.codigo === '') {
          processedItem.codigo = String(index + 1).padStart(6, '0');
        }
        
        // 6. Outros mapeamentos necessários
        processedItem.instituicao_financeira = processedItem.instituicao_financeira || '';
        processedItem.valor = processedItem.valor || 0;
        
        return processedItem;
        
      } catch (itemError) {
        console.warn(`⚠️ Erro ao processar item ${index}:`, itemError);
        // Se der erro, retorna o item original
        return item;
      }
    });
    
    console.log('✅ CUSTOS: Processamento concluído');
    console.log('📊 Dados de saída:', processedData.length, 'itens');
    
    // VERIFICAÇÃO CRÍTICA - não deve perder dados
    if (processedData.length !== input.costsData.length) {
      console.error('❌ PERDA DE DADOS DETECTADA!');
      console.error('Entrada:', input.costsData.length);
      console.error('Saída:', processedData.length);
      throw new Error(`Perda de dados: ${input.costsData.length} → ${processedData.length}`);
    }
    
    return { organizedData: processedData };
    
  } catch (error: any) {
    console.error('❌ CUSTOS: Erro:', error.message);
    console.error('❌ CUSTOS: Stack:', error.stack);
    
    // Em caso de erro, retornar dados originais para não perder nada
    console.log('🔄 Retornando dados originais devido ao erro');
    return { 
      organizedData: input.costsData || [] 
    };
  }
}

// FUNÇÃO DE DEBUG DETALHADO - Para ver os valores reais
export async function debugCostsDetailed(input: OrganizeCostsInput): Promise<any> {
  console.log('🔍 DEBUG DETALHADO: Analisando valores dos campos');
  
  if (!input.costsData || input.costsData.length === 0) {
    return { error: 'Nenhum dado fornecido' };
  }
  
  const firstItem = input.costsData[0];
  console.log('📋 Primeiro item completo:', JSON.stringify(firstItem, null, 2));
  
  // Verificar valores específicos dos campos que precisamos
  const fieldAnalysis = {
    mov_estoque: {
      value: firstItem.mov_estoque,
      type: typeof firstItem.mov_estoque,
      exists: firstItem.hasOwnProperty('mov_estoque'),
      isNull: firstItem.mov_estoque === null,
      isUndefined: firstItem.mov_estoque === undefined,
      isEmpty: firstItem.mov_estoque === ''
    },
    valor_da_parcela: {
      value: firstItem.valor_da_parcela,
      type: typeof firstItem.valor_da_parcela,
      exists: firstItem.hasOwnProperty('valor_da_parcela'),
      isNull: firstItem.valor_da_parcela === null,
      isUndefined: firstItem.valor_da_parcela === undefined,
      isEmpty: firstItem.valor_da_parcela === ''
    }
  };
  
  console.log('🔍 Análise dos campos:', fieldAnalysis);
  
  // Testar o mapeamento manually
  const testMapping: any = {};
  
  // Testar mapeamento do código
  if (firstItem.mov_estoque) {
    testMapping.codigo = String(firstItem.mov_estoque);
    console.log('✅ Mapeamento código:', firstItem.mov_estoque, '→', testMapping.codigo);
  } else {
    console.log('❌ mov_estoque não tem valor válido:', firstItem.mov_estoque);
  }
  
  // Testar mapeamento do valor
  if (firstItem.valor_da_parcela) {
    testMapping.valor = firstItem.valor_da_parcela;
    console.log('✅ Mapeamento valor:', firstItem.valor_da_parcela, '→', testMapping.valor);
  } else {
    console.log('❌ valor_da_parcela não tem valor válido:', firstItem.valor_da_parcela);
  }
  
  return {
    originalLength: input.costsData.length,
    firstItem,
    fieldAnalysis,
    testMapping,
    allFieldNames: Object.keys(firstItem || {}),
    sampleValues: Object.keys(firstItem || {}).reduce((acc: any, key: string) => {
      acc[key] = firstItem[key];
      return acc;
    }, {})
  };
}
