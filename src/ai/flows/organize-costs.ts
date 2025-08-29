'use server';

import { z } from 'zod';

export type OrganizeCostsInput = {
  costsData: any[];
  apiKey: string;
};

export type OrganizeCostsOutput = {
  organizedData: any[];
};

// FUNÇÃO PRINCIPAL - Organizar Custos
export async function organizeCosts(input: OrganizeCostsInput): Promise<OrganizeCostsOutput> {
  console.log('💰 CUSTOS: Iniciando organização');
  console.log('📊 Dados recebidos:', input.costsData?.length || 0, 'itens');
  
  try {
    if (!input || !Array.isArray(input.costsData)) {
      throw new Error('Dados de entrada inválidos');
    }
    
    if (input.costsData.length === 0) {
      return { organizedData: [] };
    }
    
    const processedData = input.costsData.map((item, index) => {
      try {
        const processedItem = JSON.parse(JSON.stringify(item));
        
        // Mapeamentos iniciais
        if (processedItem.mov_estoque) {
          processedItem.codigo = String(processedItem.mov_estoque);
        }
        if (processedItem.valor_da_parcela) {
          processedItem.valor = processedItem.valor_da_parcela;
        }

        // ORGANIZAR MODO DE PAGAMENTO SEGUINDO AS NOVAS REGRAS
        if (processedItem.modo_de_pagamento && typeof processedItem.modo_de_pagamento === 'string') {
          const modoPagamento = processedItem.modo_de_pagamento
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          // REGRA 1: PIX
          if (modoPagamento.includes('pix')) {
            processedItem.modo_de_pagamento = 'PIX';
            processedItem.tipo_de_pagamento = ''; // Limpa os campos
            processedItem.parcela = '';
          } 
          // Se for CARTAO
          else if (modoPagamento.includes('cartao')) {
            processedItem.modo_de_pagamento = 'Cartao'; // Padroniza para "Cartao"
            
            // REGRA 2: DEBITO
            if (modoPagamento.includes('debito')) {
              processedItem.tipo_de_pagamento = 'Debito';
              processedItem.parcela = '';
            } 
            // REGRA 3: CREDITO
            else { // Se não for débito, assume-se crédito
              processedItem.tipo_de_pagamento = 'Credito';
              const parcelaMatch = modoPagamento.match(/(\d+)x?/);
              if (parcelaMatch && parcelaMatch[1]) {
                processedItem.parcela = parcelaMatch[1];
              } else {
                processedItem.parcela = '1'; // Default para crédito sem parcelas explícitas
              }
            }
          }
          // OUTROS CASOS
          else {
            const originalValue = processedItem.modo_de_pagamento.trim();
            processedItem.modo_de_pagamento = originalValue.charAt(0).toUpperCase() + originalValue.slice(1).toLowerCase();
            processedItem.tipo_de_pagamento = '';
            processedItem.parcela = '';
          }
        } else {
          // Garante que os campos existam mesmo se modo_de_pagamento for nulo
          processedItem.modo_de_pagamento = processedItem.modo_de_pagamento || '';
          processedItem.tipo_de_pagamento = processedItem.tipo_de_pagamento || '';
          processedItem.parcela = processedItem.parcela || '';
        }
        
        // Garantias de tipo e valor
        if (processedItem.valor && typeof processedItem.valor === 'string') {
          const valorStr = processedItem.valor.replace(/[R$\s]/gi, '').replace(/,/g, '.');
          const valor = parseFloat(valorStr);
          processedItem.valor = isNaN(valor) ? 0 : valor;
        }
        if (!processedItem.codigo || processedItem.codigo === '') {
          processedItem.codigo = `temp_${index}`;
        }
        
        return processedItem;
        
      } catch (itemError) {
        console.warn(`⚠️ Erro ao processar item ${index}:`, itemError);
        return item; // Retorna o item original em caso de erro
      }
    });
    
    if (processedData.length !== input.costsData.length) {
      throw new Error(`Perda de dados detectada: ${input.costsData.length} → ${processedData.length}`);
    }
    
    return { organizedData: processedData };
    
  } catch (error: any) {
    console.error('❌ CUSTOS: Erro:', error.message, error.stack);
    // Retorna dados originais para não perder o trabalho do usuário
    return { 
      organizedData: input.costsData || [] 
    };
  }
}

// FUNÇÃO DE DEBUG DETALHADO (sem alterações)
export async function debugCostsDetailed(input: OrganizeCostsInput): Promise<any> {
  console.log('🔍 DEBUG DETALHADO: Analisando valores dos campos');
  
  if (!input.costsData || input.costsData.length === 0) {
    return { error: 'Nenhum dado fornecido' };
  }
  
  const firstItem = input.costsData[0];
  console.log('📋 Primeiro item completo:', JSON.stringify(firstItem, null, 2));
  
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
  
  const testMapping: any = {};
  
  if (firstItem.mov_estoque) {
    testMapping.codigo = String(firstItem.mov_estoque);
    console.log('✅ Mapeamento código:', firstItem.mov_estoque, '→', testMapping.codigo);
  } else {
    console.log('❌ mov_estoque não tem valor válido:', firstItem.mov_estoque);
  }
  
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
