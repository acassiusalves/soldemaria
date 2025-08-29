'use server';
/**
 * @fileOverview Organizes logistics data using AI.
 *
 * - organizeLogistics - A function that analyzes and structures logistics data.
 * - OrganizeLogisticsInput - The input type for the organizeLogistics function.
 * - OrganizeLogisticsOutput - The return type for the organizeLogistics function.
 */

import { ai } from '@/ai/genkit';
import { VendaDetalhada } from '@/lib/data';
import { z } from 'genkit';

const LogisticsEntrySchema = z.object({
  id: z.string().describe('The unique identifier for the entry. This MUST be returned unmodified.'),
  logistica: z.string().optional().describe('The original logistics string.'),
  entregador: z.string().optional().describe('The name of the delivery person.'),
  valor: z.number().optional().describe('The freight cost.'),
});

const OrganizeLogisticsInputSchema = z.object({
  logisticsData: z.array(z.any()).describe("An array of logistics data records to be organized."),
});
export type OrganizeLogisticsInput = z.infer<typeof OrganizeLogisticsInputSchema>;

const OrganizeLogisticsOutputSchema = z.object({
  organizedData: z.array(LogisticsEntrySchema).describe('The organized logistics data with extracted fields.'),
});
export type OrganizeLogisticsOutput = z.infer<typeof OrganizeLogisticsOutputSchema>;

export async function organizeLogistics(input: OrganizeLogisticsInput): Promise<{ organizedData: VendaDetalhada[] }> {
    const result = await organizeLogisticsFlow(input);
    
    // Merge AI results back into the original data structure
    const originalDataById = new Map(input.logisticsData.map(item => [item.id, item]));
    
    result.organizedData.forEach(organizedItem => {
        const originalItem = originalDataById.get(organizedItem.id);
        if (originalItem) {
            originalItem.entregador = organizedItem.entregador || '';
            originalItem.valor = organizedItem.valor || 0;
            // If the AI decided it was a store sale, update the logistics field
            if (organizedItem.logistica === 'Loja') {
              originalItem.logistica = 'Loja';
            }
        }
    });

    return { organizedData: Array.from(originalDataById.values()) };
}

const prompt = ai.definePrompt({
  name: 'organizeLogisticsPrompt',
  input: { schema: z.object({ logisticsData: z.array(LogisticsEntrySchema) }) },
  output: { schema: OrganizeLogisticsOutputSchema },
  prompt: `You are an intelligent data processing agent. Your task is to analyze a list of logistics entries and extract structured information.

For each entry, examine the 'logistica' field:
- If the field contains a name and a currency value (e.g., "Matheus/R$20", "Ana-15", "João R$ 10.50"), you must extract the name and the numerical value.
  - The extracted name goes into the 'entregador' field.
  - The extracted numerical value (e.g., 20, 15, 10.50) goes into the 'valor' field.
- If the 'logistica' field is exactly "Loja", it means it was an in-store pickup. In this case:
  - The 'entregador' field should be empty.
  - The 'valor' field should be 0.
  - The 'logistica' field should remain "Loja".
- For any other case, try your best to extract the information. If you cannot determine the 'entregador' or 'valor', leave the corresponding fields empty.
- Crucially, you MUST return the original 'id' for each record.

Analyze the following data and return the organized list.

Data:
\`\`\`json
{{{json logisticsData}}}
\`\`\``,
});

const organizeLogisticsFlow = ai.defineFlow(
  {
    name: 'organizeLogisticsFlow',
    inputSchema: OrganizeLogisticsInputSchema,
    outputSchema: OrganizeLogisticsOutputSchema,
  },
  async (input) => {
    // We only need to send a subset of fields to the AI to save tokens
    const dataForAI = input.logisticsData.map(item => ({
        id: item.id,
        logistica: item.logistica,
        entregador: item.entregador,
        valor: item.valor,
    }));

    const { output } = await prompt({ logisticsData: dataForAI });
    if (!output) {
      throw new Error('AI did not return an output.');
    }
    return output;
  }
);
