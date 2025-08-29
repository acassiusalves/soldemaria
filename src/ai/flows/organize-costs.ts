
'use server';

import { z } from 'zod';

export type OrganizeCostsInput = {
  costsData: any[];
  apiKey: string;
};

export type OrganizeCostsOutput = {
  organizedData: any[];
};

// This function mirrors the logic from organize-logistics.ts for manual data processing
export async function organizeCosts(input: OrganizeCostsInput): Promise<OrganizeCostsOutput> {
  console.log('🚀 ORGANIZAR CUSTOS: Iniciando função principal');
  console.log('📊 Dados de entrada:', input.costsData?.length || 0, 'itens');
  
  try {
    // Validações
    if (!input) {
      throw new Error('Input não fornecido');
    }
    
    if (!input.costsData || !Array.isArray(input.costsData)) {
      throw new Error('costsData deve ser um array');
    }
    
    if (input.costsData.length === 0) {
      console.log('⚠️ Array de custos vazio, retornando vazio');
      return { organizedData: [] };
    }
    
    console.log('📋 Exemplo de item de custo:', JSON.stringify(input.costsData[0], null, 2));
    
    // A lógica de processamento aqui pode ser ajustada para as regras de negócio de custos
    const processedData = input.costsData.map((item, index) => {
      try {
        const processedItem = JSON.parse(JSON.stringify(item));
        
        // Example processing logic - can be adapted for costs
        // For now, it just ensures some fields exist.
        if (processedItem.descricao === undefined || processedItem.descricao === null) {
            processedItem.descricao = '';
        }
        if (processedItem.valor === undefined || processedItem.valor === null) {
            processedItem.valor = 0;
        }
        
        return processedItem;
        
      } catch (itemError) {
        console.warn(`⚠️ Erro ao processar item de custo ${index}:`, itemError);
        return item; // Return original item on error
      }
    });
    
    console.log('✅ ORGANIZAR CUSTOS: Processamento concluído');
    console.log('📊 Dados de saída:', processedData.length, 'itens');
    
    if (processedData.length !== input.costsData.length) {
      console.error('❌ PERDA DE DADOS DE CUSTOS DETECTADA!');
      throw new Error(`Perda de dados: ${input.costsData.length} → ${processedData.length}`);
    }
    
    return { organizedData: processedData };
    
  } catch (error: any) {
    console.error('❌ ORGANIZAR CUSTOS: Erro:', error.message);
    console.error('❌ ORGANIZAR CUSTOS: Stack:', error.stack);
    
    console.log('🔄 Retornando dados de custos originais devido ao erro');
    return { 
      organizedData: input.costsData || [] 
    };
  }
}

    