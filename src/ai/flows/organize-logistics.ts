
'use server';

import { z } from 'zod';

// Tipos simplificados
export type OrganizeLogisticsInput = {
  logisticsData: any[];
  apiKey: string;
};

export type OrganizeLogisticsOutput = {
  organizedData: any[];
};

// VERSÃO 1: Só retorna os dados sem processar (para testar se o erro é na estrutura)
export async function organizeLogisticsTest(input: OrganizeLogisticsInput): Promise<OrganizeLogisticsOutput> {
  console.log('🧪 TESTE: Função iniciada');
  
  try {
    // Validação básica
    if (!input) {
      throw new Error('Input é null/undefined');
    }
    
    console.log('📊 Input type:', typeof input);
    console.log('📊 Has logisticsData:', !!input.logisticsData);
    console.log('📊 Has apiKey:', !!input.apiKey);
    console.log('📊 Array length:', input.logisticsData?.length);
    
    // Só retorna os dados originais para testar
    const result = {
      organizedData: input.logisticsData || []
    };
    
    console.log('✅ TESTE: Retornando dados');
    return result;
    
  } catch (error: any) {
    console.error('❌ TESTE: Erro:', error.message);
    console.error('❌ TESTE: Stack:', error.stack);
    
    // Forçar erro bem simples
    throw new Error(`Teste falhou: ${error.message}`);
  }
}

// VERSÃO 2: Processamento manual (sem IA) 
export async function organizeLogisticsManual(input: OrganizeLogisticsInput): Promise<OrganizeLogisticsOutput> {
  console.log('🔧 MANUAL: Iniciando processamento');
  
  try {
    if (!input?.logisticsData || input.logisticsData.length === 0) {
      throw new Error('Dados não fornecidos');
    }
    
    console.log('📊 Processando', input.logisticsData.length, 'itens manualmente');
    
    // Processamento manual simples
    const processedData = input.logisticsData.map((item, index) => {
      const processed = { ...item };
      
      // Lógica simples de processamento
      if (item.logistica === 'X_Loja') {
        processed.logistica = 'Loja';
        processed.entregador = '';
        processed.valor = 0;
      } else if (item.logistica && typeof item.logistica === 'string' && item.logistica.includes('/')) {
        // Ex: "João/R$15"
        const parts = item.logistica.split('/');
        processed.entregador = parts[0]?.trim() || '';
        
        if (parts[1]) {
          const valorStr = parts[1].replace(/[R$\s]/g, '').replace(',', '.');
          const valor = parseFloat(valorStr);
          processed.valor = isNaN(valor) ? 0 : valor;
        }
      } else {
        processed.entregador = processed.entregador || '';
        processed.valor = processed.valor || 0;
      }
      
      return processed;
    });
    
    console.log('✅ MANUAL: Processamento concluído');
    console.log('📋 Exemplo processado:', processedData[0]);
    
    return { organizedData: processedData };
    
  } catch (error: any) {
    console.error('❌ MANUAL: Erro:', error);
    throw new Error(`Processamento manual falhou: ${error.message}`);
  }
}

// VERSÃO 3: Com IA (mais robusta)
export async function organizeLogisticsWithAI(input: OrganizeLogisticsInput): Promise<OrganizeLogisticsOutput> {
  console.log('🤖 IA: Iniciando com IA');
  
  try {
    // Validações
    if (!input?.logisticsData || input.logisticsData.length === 0) {
      throw new Error('Dados não fornecidos');
    }
    
    if (!input.apiKey || input.apiKey.length < 10) {
      throw new Error('Chave de API inválida');
    }
    
    console.log('🔑 API Key válida:', input.apiKey.substring(0, 10) + '...');
    console.log('📊 Processando', input.logisticsData.length, 'itens com IA');
    
    // Se muitos dados, processar em lotes
    if (input.logisticsData.length > 50) {
      console.log('⚠️ Muitos dados, processando primeiro lote de 10');
      const smallBatch = input.logisticsData.slice(0, 10);
      return await processWithAI(smallBatch, input.apiKey);
    }
    
    return await processWithAI(input.logisticsData, input.apiKey);
    
  } catch (error: any) {
    console.error('❌ IA: Erro:', error);
    
    if (error.message.includes('fetch')) {
      throw new Error('Erro de conexão com a IA. Verifique sua internet.');
    } else if (error.message.includes('API')) {
      throw new Error('Problema com a chave da API. Verifique se está correta.');
    } else {
      throw new Error(`IA falhou: ${error.message}`);
    }
  }
}

// Função auxiliar para processar com IA
async function processWithAI(data: any[], apiKey: string): Promise<OrganizeLogisticsOutput> {
  const prompt = createSimplePrompt(data);
  
  console.log('📤 Enviando para Google AI...');
  
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error:', response.status, errorText);
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  console.log('📥 Resposta da IA recebida');
  
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('IA não retornou texto');
  }

  // Processar resposta da IA
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON não encontrado na resposta');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.results || !Array.isArray(parsed.results)) {
      throw new Error('Formato inválido da resposta da IA');
    }

    // Merge com dados originais
    const organizedData = data.map(originalItem => {
      const aiResult = parsed.results.find((r: any) => r.id === originalItem.id);
      if (aiResult) {
        return {
          ...originalItem,
          entregador: aiResult.entregador || '',
          valor: aiResult.valor || 0,
          logistica: aiResult.logistica === 'Loja' ? 'Loja' : originalItem.logistica
        };
      }
      return originalItem;
    });

    console.log('✅ IA: Processamento concluído');
    return { organizedData };

  } catch (parseError: any) {
    console.error('❌ Erro ao processar resposta da IA:', parseError);
    throw new Error('Erro ao interpretar resposta da IA');
  }
}

function createSimplePrompt(items: any[]): string {
  return `Organize estes dados de logística. Para cada item:
- Se logistica = "X_Loja", defina: entregador = "", valor = 0, logistica = "Loja"
- Se logistica tem formato "Nome/R$valor", extraia nome e valor
- Mantenha sempre o id original

Dados: ${JSON.stringify(items.slice(0, 5), null, 2)}

Retorne apenas este JSON:
{"results": [{"id": "...", "entregador": "...", "valor": 0, "logistica": "..."}]}`;
}
