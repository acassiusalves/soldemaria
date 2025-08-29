'use server';

import { z } from 'zod';
import { VendaDetalhada } from '@/lib/data';

// Tipos de entrada - COMPATÍVEL com sua página
const OrganizeLogisticsInputSchema = z.object({
  logisticsData: z.array(z.any()).describe("An array of logistics data records to be organized."),
  apiKey: z.string().describe("The API key for the AI service"),
});

export type OrganizeLogisticsInput = z.infer<typeof OrganizeLogisticsInputSchema>;

// Tipo de saída
const OrganizeLogisticsOutputSchema = z.object({
  organizedData: z.array(z.any()).describe('The organized logistics data with extracted fields.'),
});

export type OrganizeLogisticsOutput = z.infer<typeof OrganizeLogisticsOutputSchema>;

// Função principal - COMPATÍVEL com sua página
export async function organizeLogistics(input: OrganizeLogisticsInput): Promise<{ organizedData: VendaDetalhada[] }> {
  console.log('🚀 Iniciando organização com IA');
  console.log('📊 Dados recebidos:', input.logisticsData.length, 'itens');
  console.log('🔑 API Key presente:', !!input.apiKey);

  try {
    // Validações
    if (!input.logisticsData || input.logisticsData.length === 0) {
      throw new Error('Nenhum dado fornecido para organizar');
    }

    if (!input.apiKey) {
      throw new Error('Chave de API não fornecida');
    }

    // Preparar dados para a IA
    const itemsToProcess = input.logisticsData.map(item => ({
      id: item.id || `item-${Date.now()}-${Math.random()}`,
      logistica: item.logistica || '',
      entregador: item.entregador || '',
      valor: item.valor || 0
    }));

    console.log('🤖 Enviando para IA:', itemsToProcess.slice(0, 2)); // Log dos primeiros 2

    // Chamar API do Google AI diretamente
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': input.apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: createPrompt(itemsToProcess)
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro da API:', response.status, errorData);
      
      if (response.status === 400) {
        throw new Error('Chave de API inválida ou problema na requisição');
      } else if (response.status === 429) {
        throw new Error('Limite de uso da API atingido. Tente novamente mais tarde.');
      } else {
        throw new Error(`Erro da API: ${response.status}`);
      }
    }

    const result = await response.json();
    console.log('📥 Resposta bruta da IA:', result);

    // Extrair o texto da resposta
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('IA não retornou texto válido');
    }

    console.log('📝 Texto da IA:', text);

    // Tentar extrair JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('IA não retornou JSON válido');
    }

    const organizedResults = JSON.parse(jsonMatch[0]);
    console.log('📋 Dados organizados:', organizedResults);

    if (!organizedResults.results || !Array.isArray(organizedResults.results)) {
      throw new Error('Formato de resposta da IA inválido');
    }

    // Merge dos resultados com dados originais
    const originalDataMap = new Map(
      input.logisticsData.map(item => [item.id, item])
    );

    organizedResults.results.forEach((organizedItem: any) => {
      const originalItem = originalDataMap.get(organizedItem.id);
      if (originalItem) {
        originalItem.entregador = organizedItem.entregador || '';
        originalItem.valor = organizedItem.valor || 0;
        
        // Atualizar logística se for loja
        if (organizedItem.logistica === 'Loja') {
          originalItem.logistica = 'Loja';
        }
      }
    });

    const finalData = Array.from(originalDataMap.values());
    console.log('✅ Organização concluída:', finalData.length, 'itens processados');

    return { organizedData: finalData };

  } catch (error: any) {
    console.error('❌ Erro detalhado:', error);
    
    // Mensagens de erro mais específicas
    if (error.message.includes('API key')) {
      throw new Error('Problema com a chave da API. Verifique se está correta.');
    } else if (error.message.includes('quota') || error.message.includes('429')) {
      throw new Error('Limite de uso da API atingido. Tente novamente em alguns minutos.');
    } else if (error.message.includes('network') || error.name === 'TypeError') {
      throw new Error('Erro de conexão. Verifique sua internet.');
    } else if (error.message.includes('JSON')) {
      throw new Error('Resposta da IA em formato inválido. Tente novamente.');
    } else {
      throw new Error(`Erro ao organizar dados: ${error.message}`);
    }
  }
}

// Função para criar o prompt
function createPrompt(items: any[]): string {
  return `
Você é um assistente especializado em organizar dados de logística de vendas.

Analise cada item da lista e extraia as seguintes informações:

REGRAS IMPORTANTES:
1. Se logistica = "X_Loja" → entregador = "", valor = 0, logistica = "Loja"
2. Se logistica contém nome/valor (ex: "João/R$15", "Maria-20") → extraia nome e valor numérico
3. Se logistica = "Loja" → entregador = "", valor = 0
4. SEMPRE mantenha o ID original de cada item
5. Valores devem ser apenas números (remova R$, símbolos, etc.)

EXEMPLOS:
- Input: {"id": "123", "logistica": "Maria/R$25"} 
- Output: {"id": "123", "entregador": "Maria", "valor": 25, "logistica": "Maria/R$25"}

- Input: {"id": "456", "logistica": "X_Loja"}
- Output: {"id": "456", "entregador": "", "valor": 0, "logistica": "Loja"}

DADOS PARA PROCESSAR:
${JSON.stringify(items, null, 2)}

RETORNE APENAS o JSON no seguinte formato (sem texto adicional):
{
  "results": [
    {"id": "...", "entregador": "...", "valor": 0, "logistica": "..."}
  ]
}
`;
}
