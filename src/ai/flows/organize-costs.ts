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
  console.log('💰 CUSTOS: Iniciando organização com novas regras');
  
  if (!input?.costsData || !Array.isArray(input.costsData)) {
    console.error('❌ CUSTOS: Dados de entrada inválidos');
    return { organizedData: [] };
  }
  
  if (input.costsData.length === 0) {
    return { organizedData: [] };
  }
    
  const processedData = input.costsData.map((item, index) => {
    try {
      // Cria uma cópia para evitar modificar o objeto original diretamente no loop
      const processedItem = JSON.parse(JSON.stringify(item));

      // Mapeamentos iniciais (se existirem)
      if (item.mov_estoque) {
        processedItem.codigo = String(item.mov_estoque);
      }
      if (item.valor_da_parcela) {
        processedItem.valor = item.valor_da_parcela;
      }

      // Inicializa os campos que serão derivados
      processedItem.tipo_de_pagamento = '';
      processedItem.parcela = '';

      if (item.modo_de_pagamento && typeof item.modo_de_pagamento === 'string') {
        const originalModo = item.modo_de_pagamento.trim();
        const modoNorm = originalModo
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        // REGRA 4: Pix/QR code
        if (modoNorm.includes('pix') && modoNorm.includes('qr code')) {
          processedItem.modo_de_pagamento = 'PIX';
          processedItem.tipo_de_pagamento = 'QR Code';
        }
        // REGRA 3: Pix (e não QR code)
        else if (modoNorm.includes('pix')) {
          processedItem.modo_de_pagamento = 'PIX';
        }
        // REGRA 5: Dinheiro
        else if (modoNorm.includes('dinheiro')) {
          processedItem.modo_de_pagamento = 'Dinheiro';
        }
        // REGRA 2: Cartao/Debito
        else if (modoNorm.includes('cartao') && modoNorm.includes('debito')) {
          processedItem.modo_de_pagamento = 'Cartao';
          processedItem.tipo_de_pagamento = 'Debito';
        }
        // REGRA 3: Cartao/Credito
        else if (modoNorm.includes('cartao') && (modoNorm.includes('credito'))) {
          processedItem.modo_de_pagamento = 'Cartao';
          processedItem.tipo_de_pagamento = 'Credito';
          
          const parcelaMatch = modoNorm.match(/(\d+)x?/);
          if (parcelaMatch && parcelaMatch[1]) {
            processedItem.parcela = parcelaMatch[1];
          } else {
            processedItem.parcela = '1'; // Default para crédito sem parcelas explícitas
          }
        }
        // Caso genérico para "Cartao" sozinho
        else if (modoNorm.includes('cartao')) {
            processedItem.modo_de_pagamento = 'Cartao';
            // Assume Crédito 1x como padrão se não especificado
            processedItem.tipo_de_pagamento = 'Credito';
            processedItem.parcela = '1';
        }
        // Mantém o valor original se nenhuma regra se aplicar
        else {
          processedItem.modo_de_pagamento = originalModo;
        }
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
  
  console.log('✅ CUSTOS: Organização concluída.');
  return { organizedData: processedData };
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