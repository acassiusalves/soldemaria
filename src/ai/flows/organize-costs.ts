
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
        
        // MAPEAMENTO CORRETO PARA SUA PLANILHA
        
        // 1. Mapear mov_estoque → codigo (é o código no seu sistema)
        if (processedItem.mov_estoque) {
          processedItem.codigo = String(processedItem.mov_estoque);
        }
        
        // 2. Mapear valor_da_parcela → valor
        if (processedItem.valor_da_parcela) {
          processedItem.valor = processedItem.valor_da_parcela;
        }

        // Mapear tipo -> tipo_pagamento
        if (processedItem.tipo) {
          processedItem.tipo_pagamento = processedItem.tipo;
        }
        
        // Mapear parcelas1 -> parcela
        if (processedItem.parcelas1) {
          processedItem.parcela = processedItem.parcelas1;
        }
        
        // 3. Garantir que valor é numérico
        if (processedItem.valor && typeof processedItem.valor === 'string') {
          const valorStr = processedItem.valor.replace(/[R$\s]/gi, '').replace(/,/g, '.');
          const valor = parseFloat(valorStr);
          processedItem.valor = isNaN(valor) ? 0 : valor;
        }
        
        // 4. Garantir código existe (fallback caso mov_estoque não tenha valor)
        if (!processedItem.codigo || processedItem.codigo === '') {
          processedItem.codigo = String(index + 1).padStart(6, '0');
        }
        
        // 5. Outros mapeamentos possíveis
        if (!processedItem.modo_de_pagamento && processedItem.modo_pagamento) {
          processedItem.modo_de_pagamento = processedItem.modo_pagamento;
        }
        
        if (!processedItem.instituicao_financeira && processedItem.instituicao) {
          processedItem.instituicao_financeira = processedItem.instituicao;
        }
        
        // Campos padrão
        processedItem.modo_de_pagamento = processedItem.modo_de_pagamento || '';
        processedItem.instituicao_financeira = processedItem.instituicao_financeira || '';
        processedItem.valor = processedItem.valor || 0;
        processedItem.tipo_pagamento = processedItem.tipo_pagamento || '';
        processedItem.parcela = processedItem.parcela || '';
        
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

// FUNÇÃO DE DEBUG - Para investigar problemas
export async function debugCosts(input: OrganizeCostsInput): Promise<any> {
  console.log('🔍 DEBUG CUSTOS: Investigando dados');
  
  const originalLength = input.costsData?.length || 0;
  console.log('📊 Tamanho original:', originalLength);
  
  if (originalLength === 0) {
    return { error: 'Nenhum dado fornecido', originalLength: 0 };
  }
  
  // Analisar primeiro item
  const firstItem = input.costsData[0];
  console.log('📋 Primeiro item:', JSON.stringify(firstItem, null, 2));
  
  // Analisar todas as chaves disponíveis
  const allKeys = new Set<string>();
  input.costsData.forEach(item => {
    Object.keys(item || {}).forEach(key => allKeys.add(key));
  });
  
  const keysList = Array.from(allKeys).sort();
  console.log('🔑 Todas as chaves encontradas:', keysList);
  
  // Verificar chaves esperadas
  const expectedKeys = ['codigo', 'modo_de_pagamento', 'valor', 'instituicao_financeira'];
  const missingKeys = expectedKeys.filter(key => !keysList.includes(key));
  const extraKeys = keysList.filter(key => !expectedKeys.includes(key));
  
  console.log('❌ Chaves esperadas mas não encontradas:', missingKeys);
  console.log('➕ Chaves extras encontradas:', extraKeys);
  
  // Verificar possíveis variações das chaves
  const possibleMappings: Record<string, string[]> = {};
  keysList.forEach(key => {
    const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
    
    if (normalized.includes('codigo') || normalized.includes('cod')) {
      possibleMappings.codigo = possibleMappings.codigo || [];
      possibleMappings.codigo.push(key);
    }
    
    if (normalized.includes('modo') || normalized.includes('pagamento') || normalized.includes('payment')) {
      possibleMappings.modo_de_pagamento = possibleMappings.modo_de_pagamento || [];
      possibleMappings.modo_de_pagamento.push(key);
    }
    
    if (normalized.includes('valor') || normalized.includes('value') || normalized.includes('amount')) {
      possibleMappings.valor = possibleMappings.valor || [];
      possibleMappings.valor.push(key);
    }
    
    if (normalized.includes('instituicao') || normalized.includes('banco') || normalized.includes('bank')) {
      possibleMappings.instituicao_financeira = possibleMappings.instituicao_financeira || [];
      possibleMappings.instituicao_financeira.push(key);
    }
  });
  
  console.log('🔀 Possíveis mapeamentos:', possibleMappings);
  
  return {
    originalLength,
    firstItem,
    allKeys: keysList,
    missingKeys,
    extraKeys,
    possibleMappings,
    sampleData: input.costsData.slice(0, 3)
  };
}
