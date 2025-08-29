'use server';
/**
 * @fileOverview Organizes logistics data using AI.
 *
 * - organizeLogistics - A function that analyzes and structures logistics data.
 * - OrganizeLogisticsInput - The input type for the organizeLogistics function.
 * - OrganizeLogisticsOutput - The return type for the organizeLogistics function.
 */

import { VendaDetalhada } from '@/lib/data';
import { googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';
import { ai } from '@/ai/genkit';


const LogisticsEntrySchema = z.object({
  id: z.string().describe('The unique identifier for the entry. This MUST be returned unmodified.'),
  logistica: z.string().optional().describe('The original logistics string.'),
  entregador: z.string().optional().describe('The name of the delivery person.'),
  valor: z.number().optional().describe('The freight cost.'),
});

const OrganizeLogisticsInputSchema = z.object({
  logisticsData: z.array(z.any()).describe("An array of logistics data records to be organized."),
  apiKey: z.string().optional().describe("The user's Gemini API key."),
});
export type OrganizeLogisticsInput = z.infer<typeof OrganizeLogisticsInputSchema>;

const OrganizeLogisticsOutputSchema = z.object({
  organizedData: z.array(LogisticsEntrySchema).describe('The organized logistics data with extracted fields.'),
});
export type OrganizeLogisticsOutput = z.infer<typeof OrganizeLogisticsOutputSchema>;

export async function organizeLogistics(input: OrganizeLogisticsInput): Promise<{ organizedData: VendaDetalhada[] }> {
    console.log('🚀 Iniciando organização com', input.logisticsData.length, 'itens');
    
    try {
        if (!input.logisticsData || input.logisticsData.length === 0) {
            throw new Error('Nenhum dado fornecido para organizar');
        }
        if (!input.logisticsData[0].id) {
            throw new Error('Dados sem ID encontrados');
        }

        console.log('📋 Exemplo de dado:', JSON.stringify(input.logisticsData[0], null, 2));

        // We only need to send a subset of fields to the AI to save tokens
        const dataForAI = input.logisticsData.map(item => ({
            id: item.id,
            logistica: String(item.logistica ?? ''), // Ensure logistica is always a string
        }));

        const result = await organizeLogisticsFlow({ logisticsData: dataForAI, apiKey: input.apiKey });
        
        if (!result || !result.organizedData) {
            throw new Error('IA não retornou dados válidos');
        }

        console.log('✅ IA processou', result.organizedData.length, 'itens');
        
        const originalDataById = new Map(input.logisticsData.map(item => [item.id, item]));
        
        result.organizedData.forEach((organizedItem) => {
            const originalItem = originalDataById.get(organizedItem.id);
            if (originalItem) {
                originalItem.entregador = organizedItem.entregador || '';
                originalItem.valor = organizedItem.valor || 0;
                if (organizedItem.logistica === 'Loja') {
                    originalItem.logistica = 'Loja';
                }
            } else {
                console.warn(`⚠️ Item com ID ${organizedItem.id} não encontrado nos dados originais`);
            }
        });

        const finalData = Array.from(originalDataById.values());
        console.log('🎉 Finalizado com sucesso:', finalData.length, 'itens');
        
        return { organizedData: finalData };
        
    } catch (error: any) {
        console.error('❌ Erro detalhado:', {
            message: error.message,
            stack: error.stack,
            inputSize: input.logisticsData?.length
        });
        
        if (error.message.includes('AI')) {
            throw new Error('Falha na comunicação com a IA. Tente novamente.');
        } else if (error.message.includes('network')) {
            throw new Error('Problema de conexão. Verifique sua internet.');
        } else {
            throw new Error(`Erro ao processar dados: ${error.message}`);
        }
    }
}


const organizeLogisticsFlow = ai.defineFlow(
  {
    name: 'organizeLogisticsFlow',
    inputSchema: z.object({ 
      logisticsData: z.array(z.object({ id: z.string(), logistica: z.string().optional() })),
      apiKey: z.string().optional(),
    }),
    outputSchema: OrganizeLogisticsOutputSchema,
  },
  async (input) => {
    const customAI = genkit({
      plugins: [googleAI({ apiKey: input.apiKey })],
    });

    const { output } = await customAI.generate({
        model: 'gemini-1.5-flash',
        prompt: `You are an intelligent data processing agent. Your task is to analyze a list of logistics entries and extract structured information.

For each entry, examine the 'logistica' field:
- If the field contains a name and a currency value (e.g., "Matheus/R$20", "Ana-15", "João R$ 10.50"), extract the name and numerical value.
- If the field is exactly "Loja" or "X_Loja", it means it was an in-store pickup:
  - Set 'entregador' as empty string
  - Set 'valor' as 0
  - Set 'logistica' as "Loja"
- If the field contains "X_" prefix (like "X_Loja"), remove the "X_" prefix
- For any other case, try your best to extract the information.
- ALWAYS return the original 'id' for each record.

Data to analyze:
\`\`\`json
{{{json logisticsData}}}
\`\`\``,
        input: { logisticsData: input.logisticsData },
        output: { schema: OrganizeLogisticsOutputSchema },
    });
    
    if (!output) {
      throw new Error('AI did not return an output.');
    }
    return output;
  }
);
