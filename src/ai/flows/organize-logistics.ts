'use server';

import { z } from 'zod';

export type OrganizeLogisticsInput = {
  logisticsData: any[];
  apiKey: string;
};

export type OrganizeLogisticsOutput = {
  organizedData: any[];
};

// FUNÇÃO FINAL - CORRIGIDA PARA NÃO PERDER DADOS
export async function organizeLogistics(input: OrganizeLogisticsInput): Promise<OrganizeLogisticsOutput> {
  console.log('🚀 ORGANIZAR: Iniciando função principal');
  console.log('📊 Dados de entrada:', input.logisticsData?.length || 0, 'itens');
  
  try {
    // Validações
    if (!input) {
      throw new Error('Input não fornecido');
    }
    
    if (!input.logisticsData || !Array.isArray(input.logisticsData)) {
      throw new Error('logisticsData deve ser um array');
    }
    
    if (input.logisticsData.length === 0) {
      console.log('⚠️ Array vazio, retornando vazio');
      return { organizedData: [] };
    }
    
    console.log('📋 Exemplo de item:', JSON.stringify(input.logisticsData[0], null, 2));
    
    // Processar TODOS os dados - sem perder nenhum
    const processedData = input.logisticsData.map((item, index) => {
      try {
        // Criar uma cópia completa do item original
        const processedItem = JSON.parse(JSON.stringify(item));
        
        // Só processar se tem campo logistica
        if (processedItem.logistica && typeof processedItem.logistica === 'string') {
          const logistica = processedItem.logistica.trim();
          
          // Caso 1: X_Loja ou Loja
          if (logistica === 'X_Loja' || logistica === 'Loja') {
            processedItem.logistica = 'Loja';
            processedItem.entregador = '';
            processedItem.valor = 0;
          }
          // Caso 2: Formato "Nome/Valor" ou "Nome-Valor"
          else if (logistica.includes('/') || logistica.includes('-')) {
            const separator = logistica.includes('/') ? '/' : '-';
            const parts = logistica.split(separator);
            
            if (parts.length >= 2) {
              // Nome do entregador
              processedItem.entregador = parts[0].trim();
              
              // Extrair valor
              let valorStr = parts[1].trim();
              valorStr = valorStr.replace(/[R$\s]/gi, ''); // Remove R$, espaços
              valorStr = valorStr.replace(/,/g, '.'); // Vírgula para ponto
              
              const valor = parseFloat(valorStr);
              processedItem.valor = isNaN(valor) ? 0 : valor;
            }
          }
          // Caso 3: Outros formatos - manter como está
          else {
            // Manter logística original, garantir que tem entregador e valor
            if (processedItem.entregador === undefined || processedItem.entregador === null) {
              processedItem.entregador = '';
            }
            if (processedItem.valor === undefined || processedItem.valor === null) {
              processedItem.valor = 0;
            }
          }
        } else {
          // Item sem logística - garantir campos padrão
          if (processedItem.entregador === undefined || processedItem.entregador === null) {
            processedItem.entregador = '';
          }
          if (processedItem.valor === undefined || processedItem.valor === null) {
            processedItem.valor = 0;
          }
        }
        
        return processedItem;
        
      } catch (itemError) {
        console.warn(`⚠️ Erro ao processar item ${index}:`, itemError);
        // Se der erro, retorna o item original
        return item;
      }
    });
    
    console.log('✅ ORGANIZAR: Processamento concluído');
    console.log('📊 Dados de saída:', processedData.length, 'itens');
    console.log('📋 Exemplo processado:', JSON.stringify(processedData[0], null, 2));
    
    // VERIFICAÇÃO CRÍTICA - não deve perder dados
    if (processedData.length !== input.logisticsData.length) {
      console.error('❌ PERDA DE DADOS DETECTADA!');
      console.error('Entrada:', input.logisticsData.length);
      console.error('Saída:', processedData.length);
      throw new Error(`Perda de dados: ${input.logisticsData.length} → ${processedData.length}`);
    }
    
    return { organizedData: processedData };
    
  } catch (error: any) {
    console.error('❌ ORGANIZAR: Erro:', error.message);
    console.error('❌ ORGANIZAR: Stack:', error.stack);
    
    // Em caso de erro, retornar dados originais para não perder nada
    console.log('🔄 Retornando dados originais devido ao erro');
    return { 
      organizedData: input.logisticsData || [] 
    };
  }
}

// FUNÇÃO DE DEBUG - Para investigar perda de dados
export async function debugDataLoss(input: OrganizeLogisticsInput): Promise<any> {
  console.log('🔍 DEBUG: Investigando perda de dados');
  
  const originalLength = input.logisticsData?.length || 0;
  console.log('📊 Tamanho original:', originalLength);
  
  // Verificar se todos os itens são válidos
  let validItems = 0;
  let invalidItems = 0;
  
  for (let i = 0; i < originalLength; i++) {
    const item = input.logisticsData[i];
    
    try {
      // Tentar serializar/deserializar (simula o que Next.js faz)
      const serialized = JSON.stringify(item);
      const deserialized = JSON.parse(serialized);
      
      if (deserialized) {
        validItems++;
      } else {
        invalidItems++;
        console.warn(`Item ${i} inválido após serialização`);
      }
      
    } catch (error) {
      invalidItems++;
      console.warn(`Item ${i} não serializável:`, error);
    }
  }
  
  console.log('✅ Itens válidos:', validItems);
  console.log('❌ Itens inválidos:', invalidItems);
  
  // Verificar tipos de dados
  const types: Record<string, number> = {};
  input.logisticsData?.forEach((item, index) => {
    const type = typeof item;
    types[type] = (types[type] || 0) + 1;
    
    // Log de itens problemáticos
    if (type !== 'object' || item === null) {
      console.warn(`Item ${index} tipo problemático:`, type, item);
    }
  });
  
  console.log('📊 Tipos de dados:', types);
  
  return {
    originalLength,
    validItems,
    invalidItems,
    types,
    firstFewItems: input.logisticsData?.slice(0, 3) || []
  };
}